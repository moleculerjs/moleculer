const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const P = require("../../../src/packets");
const { protectReject } = require("../utils");

// const lolex = require("@sinonjs/fake-timers");

jest.mock("node-nats-streaming");

let Stan = require("node-nats-streaming");
Stan.connect = jest.fn(() => {
	let callbacks = {};
	//let subscriptions = {};
	const c = {
		on: jest.fn((event, cb) => (callbacks[event] = cb)),
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

		callbacks
		//subscriptions
	};

	return c;
});

const StanTransporter = require("../../../src/transporters/stan");

describe("Test StanTransporter constructor", () => {
	it("check constructor", () => {
		let transporter = new StanTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({ clusterID: "test-cluster", preserveBuffers: true });
		expect(transporter.connected).toBe(false);
		expect(transporter.hasBuiltInBalancer).toBe(true);
		expect(transporter.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new StanTransporter("stan://localhost");
		expect(transporter.opts).toEqual({
			clusterID: "test-cluster",
			preserveBuffers: true,
			url: "nats://localhost"
		});
	});

	it("check constructor with options", () => {
		let opts = { host: "localhost", port: 1234 };
		let transporter = new StanTransporter(opts);
		expect(transporter.opts).toEqual({
			clusterID: "test-cluster",
			host: "localhost",
			port: 1234,
			preserveBuffers: true
		});
	});

	it("check constructor with disabled preserveBuffers", () => {
		let opts = { preserveBuffers: false };
		let transporter = new StanTransporter(opts);
		expect(transporter.opts).toEqual({ clusterID: "test-cluster", preserveBuffers: false });
	});
});

describe("Test StanTransporter connect & disconnect & reconnect", () => {
	let broker = new ServiceBroker({ logger: false });
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new StanTransporter();
		transporter.init(transit, msgHandler);
	});

	it("check connect", () => {
		let p = transporter
			.connect()
			.catch(protectReject)
			.then(() => {
				expect(transporter.client).toBeDefined();
				expect(transporter.client.on).toHaveBeenCalledTimes(6);
				expect(transporter.client.on).toHaveBeenCalledWith("connect", expect.any(Function));
				expect(transporter.client.on).toHaveBeenCalledWith(
					"reconnect",
					expect.any(Function)
				);
				expect(transporter.client.on).toHaveBeenCalledWith(
					"reconnecting",
					expect.any(Function)
				);
				expect(transporter.client.on).toHaveBeenCalledWith(
					"disconnect",
					expect.any(Function)
				);
				expect(transporter.client.on).toHaveBeenCalledWith("error", expect.any(Function));
				expect(transporter.client.on).toHaveBeenCalledWith("close", expect.any(Function));
			});

		transporter._client.callbacks.connect();

		return p;
	});

	it("check connect - should throw error", () => {
		broker.broadcastLocal = jest.fn();

		let p = transporter.connect().catch(() => {
			expect(transporter._client).toBeDefined();

			expect(broker.broadcastLocal).toHaveBeenCalledTimes(1);
			expect(broker.broadcastLocal).toHaveBeenNthCalledWith(1, "$transporter.error", {
				error: new Error("Ups"),
				module: "transporter",
				type: "clientError"
			});
		});

		// Trigger an error
		const error = new Error("Ups");
		transporter._client.callbacks.error(error);

		return p;
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		let p = transporter
			.connect()
			.catch(protectReject)
			.then(() => {
				expect(transporter.onConnected).toHaveBeenCalledTimes(1);
				expect(transporter.onConnected).toHaveBeenCalledWith();
			});

		transporter._client.callbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check onConnected after reconnect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());

		let p = transporter
			.connect()
			.catch(protectReject)
			.then(() => {
				transporter.onConnected.mockClear();
				transporter._client.callbacks.reconnect(); // Trigger the `resolve`
				expect(transporter.onConnected).toHaveBeenCalledTimes(1);
				expect(transporter.onConnected).toHaveBeenCalledWith(true);
			});

		transporter._client.callbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check disconnect", () => {
		let p = transporter
			.connect()
			.catch(protectReject)
			.then(() => {
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

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new StanTransporter();
		transporter.init(
			new Transit(new ServiceBroker({ logger: false, namespace: "TEST" })),
			msgHandler
		);

		let p = transporter.connect();
		transporter._client.callbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		let subCb;
		let subscribeOn = jest.fn((msg, cb) => {
			subCb = cb;
		});
		transporter.client.subscribe = jest.fn(() => {
			return {
				on: subscribeOn
			};
		});
		transporter.incomingMessage = jest.fn();

		transporter.subscribe("REQ", "node");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith(
			"MOL-TEST.REQ.node",
			expect.any(Object)
		);

		expect(transporter.client.subscriptionOptions).toHaveBeenCalledTimes(1);

		expect(subscribeOn).toHaveBeenCalledTimes(1);
		expect(subscribeOn).toHaveBeenCalledWith("message", expect.any(Function));

		// Test subscribe callback
		subCb({
			getRawData() {
				return "incoming data";
			}
		});
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check subscribeBalancedRequest", () => {
		transporter.client.subscriptionOptions.mockClear();
		transporter.client.setDeliverAllAvailable.mockClear();
		transporter.client.setDurableName.mockClear();

		let subCb;
		let subscribeOn = jest.fn((msg, cb) => {
			subCb = cb;
		});
		transporter.client.subscribe = jest.fn(() => {
			return {
				on: subscribeOn
			};
		});
		transporter.incomingMessage = jest.fn();

		transporter.subscribeBalancedRequest("posts.find");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith(
			"MOL-TEST.REQB.posts.find",
			"posts.find",
			expect.any(Object)
		);

		expect(transporter.client.subscriptionOptions).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDeliverAllAvailable).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledWith("REQB");

		expect(subscribeOn).toHaveBeenCalledTimes(1);
		expect(subscribeOn).toHaveBeenCalledWith("message", expect.any(Function));

		// Test subscribe callback
		subCb({
			getRawData() {
				return "incoming data";
			}
		});
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("REQ", "incoming data");
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
		transporter.client.subscribe = jest.fn(() => {
			return {
				on: subscribeOn,
				unsubscribe: unsubscribe
			};
		});
		transporter.incomingMessage = jest.fn();

		transporter.subscribeBalancedEvent("user.created", "mail");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith(
			"MOL-TEST.EVENTB.mail.user.created",
			"mail",
			expect.any(Object)
		);

		expect(transporter.client.subscriptionOptions).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDeliverAllAvailable).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledTimes(1);
		expect(transporter.client.setDurableName).toHaveBeenCalledWith("EVENTB");

		expect(subscribeOn).toHaveBeenCalledTimes(1);
		expect(subscribeOn).toHaveBeenCalledWith("message", expect.any(Function));

		// Test subscribe callback
		subCb({
			getRawData() {
				return "incoming data";
			}
		});
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("EVENT", "incoming data");

		// Test unsubscribeFromBalancedCommands
		transporter.client.unsubscribe = jest.fn();

		return transporter
			.unsubscribeFromBalancedCommands()
			.catch(protectReject)
			.then(() => {
				expect(unsubscribe).toHaveBeenCalledTimes(1);
			});
	});

	it("check publish with target", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_INFO, "node2", {});
		return transporter
			.publish(packet)
			.catch(protectReject)
			.then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO.node2",
					Buffer.from("json data"),
					expect.any(Function)
				);
			});
	});

	it("check publish without target", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_INFO, null, {});
		return transporter
			.publish(packet)
			.catch(protectReject)
			.then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.INFO",
					Buffer.from("json data"),
					expect.any(Function)
				);
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
		return transporter
			.publishBalancedEvent(packet, "mail")
			.catch(protectReject)
			.then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.EVENTB.mail.user.created",
					Buffer.from("json data"),
					expect.any(Function)
				);
			});
	});

	it("check publishBalancedRequest", () => {
		transporter.serialize = jest.fn(() => Buffer.from("json data"));
		transporter.client.publish = jest.fn((topic, payload, resolve) => resolve());
		const packet = new P.Packet(P.PACKET_REQUEST, null, {
			action: "posts.find"
		});
		return transporter
			.publishBalancedRequest(packet)
			.catch(protectReject)
			.then(() => {
				expect(transporter.client.publish).toHaveBeenCalledTimes(1);
				expect(transporter.client.publish).toHaveBeenCalledWith(
					"MOL-TEST.REQB.posts.find",
					Buffer.from("json data"),
					expect.any(Function)
				);
			});
	});
});
