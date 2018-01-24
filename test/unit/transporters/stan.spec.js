const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const { PacketInfo, PacketEvent, PacketRequest } = require("../../../src/packets");
const { protectReject } = require("../utils");

// const lolex = require("lolex");

jest.mock("node-nats-streaming");

let Stan = require("node-nats-streaming");
Stan.connect = jest.fn(() => {
	let callbacks = {};
	//let subscriptions = {};
	const c = {
		on: jest.fn((event, cb) => callbacks[event] = cb),
		close: jest.fn(),
		/*subscribe: jest.fn((topic, opts) => {
			return {
				on: (msg, cb) => subscriptions[topic] = cb
			};
		}),*/
		publish: jest.fn(),

		subscriptionOptions: jest.fn(() => c),
		setDeliverAllAvailable: jest.fn(() => c),
		setDurableName: jest.fn(() => c),

		callbacks,
		//subscriptions
	};

	return c;
});

const StanTransporter = require("../../../src/transporters/stan");


describe("Test StanTransporter constructor", () => {

	it("check constructor", () => {
		let transporter = new StanTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({ stan: { clusterID: "test-cluster", preserveBuffers: true }});
		expect(transporter.connected).toBe(false);
		expect(transporter.hasBuiltInBalancer).toBe(true);
		expect(transporter.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new StanTransporter("stan://localhost");
		expect(transporter.opts).toEqual({ stan: { clusterID: "test-cluster", preserveBuffers: true, url: "nats://localhost" }});
	});

	it("check constructor with options", () => {
		let opts = { stan: { host: "localhost", port: 1234} };
		let transporter = new StanTransporter(opts);
		expect(transporter.opts).toEqual({ stan: { clusterID: "test-cluster", host: "localhost", port: 1234, preserveBuffers: true } });
	});

	it("check constructor with disabled preserveBuffers", () => {
		let opts = { stan: { preserveBuffers: false } };
		let transporter = new StanTransporter(opts);
		expect(transporter.opts).toEqual({ stan: { clusterID: "test-cluster", preserveBuffers: false } });
	});
});

describe("Test StanTransporter connect & disconnect & reconnect", () => {
	let broker = new ServiceBroker();
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new StanTransporter();
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

		transporter._client.callbacks.connect();

		return p;
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		let p = transporter.connect().catch(protectReject).then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});

		transporter._client.callbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check onConnected after reconnect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());

		let p = transporter.connect().catch(protectReject).then(() => {
			transporter.onConnected.mockClear();
			transporter._client.callbacks.reconnect(); // Trigger the `resolve`
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith(true);
		});

		transporter._client.callbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check disconnect", () => {
		let p = transporter.connect().catch(protectReject).then(() => {
			let cb = transporter.client.close;
			transporter.disconnect();
			expect(transporter.client).toBeNull();
			expect(cb).toHaveBeenCalledTimes(1);
		});

		transporter._client.callbacks.connect(); // Trigger the `resolve`
		return p;
	});

});

describe("Test StanTransporter subscribe & publish", () => {
	let transporter;
	let msgHandler;

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new StanTransporter();
		transporter.init(new Transit(new ServiceBroker({ namespace: "TEST" })), msgHandler);

		let p = transporter.connect();
		transporter._client.callbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		let subCb;
		let subscribeOn = jest.fn((msg, cb) => {
			subCb = cb;
		});
		transporter.client.subscribe = jest.fn((topic, opts) => {
			return {
				on: subscribeOn
			};
		});

		transporter.subscribe("REQ", "node");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.REQ.node", jasmine.any(Object));

		expect(transporter.client.subscriptionOptions).toHaveBeenCalledTimes(1);

		expect(subscribeOn).toHaveBeenCalledTimes(1);
		expect(subscribeOn).toHaveBeenCalledWith("message", jasmine.any(Function));

		// Test subscribe callback
		subCb({
			getRawData() {
				return "incoming data";
			}
		});
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check subscribeBalancedRequest", () => {
		transporter.client.subscriptionOptions.mockClear();
		transporter.client.setDeliverAllAvailable.mockClear();
		transporter.client.setDurableName.mockClear();

		let subCb;
		let subscribeOn = jest.fn((msg, cb) => {
			subCb = cb;
		});
		transporter.client.subscribe = jest.fn((topic, opts) => {
			return {
				on: subscribeOn,
			};
		});

		transporter.subscribeBalancedRequest("posts.find");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.REQB.posts.find", "posts.find", jasmine.any(Object));

		expect(transporter.client.subscriptionOptions).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDeliverAllAvailable).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledWith("REQB");

		expect(subscribeOn).toHaveBeenCalledTimes(1);
		expect(subscribeOn).toHaveBeenCalledWith("message", jasmine.any(Function));

		// Test subscribe callback
		subCb({
			getRawData() {
				return "incoming data";
			}
		});
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check subscribeBalancedEvent", () => {
		transporter.client.subscriptionOptions.mockClear();
		transporter.client.setDeliverAllAvailable.mockClear();
		transporter.client.setDurableName.mockClear();

		let subCb;
		let subscribeOn = jest.fn((msg, cb) => {
			subCb = cb;
		});
		let unsubscribe = jest.fn();
		transporter.client.subscribe = jest.fn((topic, opts) => {
			return {
				on: subscribeOn,
				unsubscribe: unsubscribe,
			};
		});

		transporter.subscribeBalancedEvent("user.created", "mail");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("MOL-TEST.EVENTB.mail.user.created", "mail", jasmine.any(Object));

		expect(transporter.client.subscriptionOptions).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDeliverAllAvailable).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledWith("EVENTB");

		expect(subscribeOn).toHaveBeenCalledTimes(1);
		expect(subscribeOn).toHaveBeenCalledWith("message", jasmine.any(Function));

		// Test subscribe callback
		subCb({
			getRawData() {
				return "incoming data";
			}
		});
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("EVENT", "incoming data");


		// Test unsubscribeFromBalancedCommands
		transporter.client.unsubscribe = jest.fn();

		return transporter.unsubscribeFromBalancedCommands().catch(protectReject).then(() => {
			expect(unsubscribe).toHaveBeenCalledTimes(1);
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

