const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const P = require("../../../src/packets");
const { protectReject } = require("../utils");

// const lolex = require("lolex");

jest.mock("nats");

let Nats = require("nats");
Nats.connect = jest.fn(() => {
	let onCallbacks = {};
	return {
		on: jest.fn((event, cb) => onCallbacks[event] = cb),
		close: jest.fn(),
		subscribe: jest.fn(),
		publish: jest.fn(),

		onCallbacks
	};
});

const NatsTransporter = require("../../../src/transporters/nats");


describe("Test NatsTransporter constructor", () => {

	it("check constructor", () => {
		let transporter = new NatsTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({ preserveBuffers: true, maxReconnectAttempts: -1 });
		expect(transporter.connected).toBe(false);
		expect(transporter.hasBuiltInBalancer).toBe(true);
		expect(transporter.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new NatsTransporter("nats://localhost");
		expect(transporter.opts).toEqual({ preserveBuffers: true, maxReconnectAttempts: -1, url: "nats://localhost" });
	});

	it("check constructor with options", () => {
		let opts = { host: "localhost", port: 1234 };
		let transporter = new NatsTransporter(opts);
		expect(transporter.opts).toEqual({ host: "localhost", port: 1234, preserveBuffers: true, maxReconnectAttempts: -1 });
	});

	it("check constructor with disabled preserveBuffers & maxReconnectAttempts", () => {
		let opts = { preserveBuffers: false, maxReconnectAttempts: 3 };
		let transporter = new NatsTransporter(opts);
		expect(transporter.opts).toEqual({ preserveBuffers: false, maxReconnectAttempts: 3 });
	});
});

describe("Test NatsTransporter connect & disconnect & reconnect", () => {
	let broker = new ServiceBroker({ logger: false });
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new NatsTransporter();
		transporter.init(transit, msgHandler);
	});

	it("check connect", () => {
		let p = transporter.connect().catch(protectReject).then(() => {
			expect(transporter.client).toBeDefined();
			expect(transporter.client.on).toHaveBeenCalledTimes(6);
			expect(transporter.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("reconnect", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("reconnecting", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("disconnect", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
		});

		transporter._client.onCallbacks.connect();

		return p;
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		let p = transporter.connect().catch(protectReject).then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check onConnected after reconnect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());

		let p = transporter.connect().catch(protectReject).then(() => {
			transporter.onConnected.mockClear();
			transporter._client.onCallbacks.reconnect(); // Trigger the `resolve`
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith(true);
		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check disconnect", () => {
		const flushCB = jest.fn(cb => cb());
		let p = transporter.connect().catch(protectReject).then(() => {
			let cb = transporter.client.close;
			transporter.client.flush = flushCB;

			transporter.disconnect();
			expect(transporter.client).toBeNull();
			expect(cb).toHaveBeenCalledTimes(1);
			expect(flushCB).toHaveBeenCalledTimes(1);

		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

});

describe("Test NatsTransporter subscribe & publish", () => {
	let transporter;

	beforeEach(() => {
		transporter = new NatsTransporter();
		transporter.init(new Transit(new ServiceBroker({ logger: false, namespace: "TEST", nodeID: "node-123" })));

		let p = transporter.connect();
		transporter._client.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		let subCb;
		transporter.client.subscribe = jest.fn((name, cb) => subCb = cb);
		transporter.incomingMessage = jest.fn();

		transporter.subscribe("REQ", "node");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		subCb("{ sender: \"node1\" }");
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("REQ", "{ sender: \"node1\" }");
	});

	it("check subscribeBalancedRequest", () => {
		let subCb;
		transporter.client.subscribe = jest.fn((name, opts, cb) => {
			subCb = cb;
			return 123;
		});
		transporter.incomingMessage = jest.fn();

		transporter.subscribeBalancedRequest("posts.find");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.REQB.posts.find", { queue: "posts.find" }, jasmine.any(Function));

		// Test subscribe callback
		subCb("{ sender: \"node1\" }");
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("REQ", "{ sender: \"node1\" }");
		expect(transporter.subscriptions).toEqual([123]);
	});

	describe("Test subscribeBalancedEvent", () => {

		it("check subscription & unsubscription", () => {
			let subCb;
			transporter.client.subscribe = jest.fn((name, opts, cb) => {
				subCb = cb;
				return 125;
			});
			transporter.incomingMessage = jest.fn();

			transporter.subscribeBalancedEvent("user.created", "mail");

			expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
			expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.EVENTB.mail.user.created", { queue: "mail" }, jasmine.any(Function));

			// Test subscribe callback
			subCb("{ sender: \"node1\" }");
			expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
			expect(transporter.incomingMessage).toHaveBeenCalledWith("EVENT", "{ sender: \"node1\" }");
			expect(transporter.subscriptions).toEqual([125]);

			// Test unsubscribeFromBalancedCommands
			transporter.client.unsubscribe = jest.fn();
			transporter.client.flush = jest.fn(cb => cb());

			return transporter.unsubscribeFromBalancedCommands().catch(protectReject).then(() => {
				expect(transporter.subscriptions).toEqual([]);
				expect(transporter.client.unsubscribe).toHaveBeenCalledTimes(1);
				expect(transporter.client.unsubscribe).toHaveBeenCalledWith(125);
				expect(transporter.client.flush).toHaveBeenCalledTimes(1);
			});
		});

		it("check with '*' wildchar topic", () => {
			transporter.client.subscribe = jest.fn();

			transporter.subscribeBalancedEvent("user.*", "users");

			expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
			expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.EVENTB.users.user.*", { queue: "users" }, jasmine.any(Function));
		});

		it("check with '**' wildchar topic", () => {
			transporter.client.subscribe = jest.fn();

			transporter.subscribeBalancedEvent("user.**", "users");

			expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
			expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.EVENTB.users.user.>", { queue: "users" }, jasmine.any(Function));
		});

		it("check with '**' wildchar (as not last) topic", () => {
			transporter.client.subscribe = jest.fn();

			transporter.subscribeBalancedEvent("user.**.changed", "users");

			expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
			expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.EVENTB.users.user.>", { queue: "users" }, jasmine.any(Function));
		});
	});

	it("check publish with target", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_INFO, "node2", {});
		return transporter.publish(packet)
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO.node2",
					Buffer.from("json data"),
					expect.any(Function)
				);

				expect(transporter.serialize).toHaveBeenCalledTimes(1);
				expect(transporter.serialize).toHaveBeenCalledWith(packet);
			});
	});

	it("check publish without target", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_INFO, null, {});
		return transporter.publish(packet)
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO",
					Buffer.from("json data"),
					expect.any(Function)
				);

				expect(transporter.serialize).toHaveBeenCalledTimes(1);
				expect(transporter.serialize).toHaveBeenCalledWith(packet);
			});
	});

	it("check publishBalancedEvent", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_EVENT, null, {
			event: "user.created",
			data: { id: 5 },
			groups: ["mail"]
		});
		return transporter.publishBalancedEvent(packet, "mail")
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.EVENTB.mail.user.created",
					Buffer.from("json data"),
					expect.any(Function)
				);
				expect(transporter.serialize).toHaveBeenCalledTimes(1);
				expect(transporter.serialize).toHaveBeenCalledWith(packet);
			});

	});

	it("check publishBalancedRequest", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_REQUEST, null, {
			action: "posts.find"
		});
		return transporter.publishBalancedRequest(packet)
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.REQB.posts.find",
					Buffer.from("json data"),
					expect.any(Function)
				);

				expect(transporter.serialize).toHaveBeenCalledTimes(1);
				expect(transporter.serialize).toHaveBeenCalledWith(packet);
			});

	});
});
