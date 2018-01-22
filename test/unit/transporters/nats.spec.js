const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const { PacketInfo, PacketEvent, PacketRequest } = require("../../../src/packets");
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
		expect(transporter.opts).toEqual({ nats: { preserveBuffers: true }});
		expect(transporter.connected).toBe(false);
		expect(transporter.hasBuiltInBalancer).toBe(true);
		expect(transporter.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new NatsTransporter("nats://localhost");
		expect(transporter.opts).toEqual({ nats: { preserveBuffers: true, url: "nats://localhost" }});
	});

	it("check constructor with options", () => {
		let opts = { nats: { host: "localhost", port: 1234} };
		let transporter = new NatsTransporter(opts);
		expect(transporter.opts).toEqual({ nats: { host: "localhost", port: 1234, preserveBuffers: true } });
	});

	it("check constructor with disabled preserveBuffers", () => {
		let opts = { nats: { preserveBuffers: false } };
		let transporter = new NatsTransporter(opts);
		expect(transporter.opts).toEqual({ nats: { preserveBuffers: false } });
	});
});

describe("Test NatsTransporter connect & disconnect & reconnect", () => {
	let broker = new ServiceBroker();
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
	let msgHandler;

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new NatsTransporter();
		transporter.init(new Transit(new ServiceBroker({ namespace: "TEST" })), msgHandler);

		let p = transporter.connect();
		transporter._client.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		let subCb;
		transporter.client.subscribe = jest.fn((name, cb) => subCb = cb);

		transporter.subscribe("REQ", "node");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data", null, "prefix,test,name");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check subscribeBalancedRequest", () => {
		let subCb;
		transporter.client.subscribe = jest.fn((name, opts, cb) => {
			subCb = cb;
			return 123;
		});

		transporter.subscribeBalancedRequest("posts.find");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.REQB.posts.find", { queue: "posts.find" }, jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
		expect(transporter.subscriptions).toEqual([123]);
	});

	it("check subscribeBalancedEvent", () => {
		let subCb;
		transporter.client.subscribe = jest.fn((name, opts, cb) => {
			subCb = cb;
			return 125;
		});

		transporter.subscribeBalancedEvent("user.created", "mail");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.EVENTB.mail.user.created", { queue: "mail" }, jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("EVENT", "incoming data");
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

	it("check publish with target", () => {
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new PacketInfo(fakeTransit, "node2", {});
		return transporter.publish(packet)
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO.node2",
					Buffer.from(JSON.stringify({"ver": "3", "sender": "node1"})),
					expect.any(Function)
				);
			});
	});

	it("check publish without target", () => {
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new PacketInfo(fakeTransit, null, {});
		return transporter.publish(packet)
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO",
					Buffer.from(JSON.stringify({"ver": "3", "sender": "node1"})),
					expect.any(Function)
				);
			});
	});

	it("check publishBalancedEvent", () => {
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new PacketEvent(fakeTransit, null, "user.created", { id: 5 }, ["mail"]);
		return transporter.publishBalancedEvent(packet, "mail")
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.EVENTB.mail.user.created",
					Buffer.from(JSON.stringify({"ver": "3", "sender": "node1", "event": "user.created", "data": { id: 5 }, "groups": ["mail"], "broadcast": false })),
					expect.any(Function)
				);
			});

	});

	it("check publishBalancedRequest", () => {
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		let ctx = {
			action: { name: "posts.find" },
			params: { a: 5 }
		};
		const packet = new PacketRequest(fakeTransit, null, ctx);
		return transporter.publishBalancedRequest(packet)
			.catch(protectReject).then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.REQB.posts.find",
					Buffer.from(JSON.stringify({"ver": "3", "sender": "node1", "action": "posts.find", "params": { a: 5 }})),
					expect.any(Function)
				);
			});

	});
});
