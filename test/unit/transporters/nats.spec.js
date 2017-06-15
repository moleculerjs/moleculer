const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const { PacketInfo } = require("../../../src/packets");

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
		let p = transporter.connect().then(() => {
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
		let p = transporter.connect().then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`

		return p;
	});

	it("check onConnected after reconnect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());

		let p = transporter.connect().then(() => {
			transporter.onConnected.mockClear();
			transporter._client.onCallbacks.reconnect(); // Trigger the `resolve`
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith(true);
		});

		transporter._client.onCallbacks.connect(); // Trigger the `resolve`

		return p;
	});	

	it("check disconnect", () => {
		let p = transporter.connect().then(() => {
			let cb = transporter.client.close;
			transporter.disconnect();
			expect(transporter.client).toBeNull();
			expect(cb).toHaveBeenCalledTimes(1);

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
		transporter = new NatsTransporter({ prefix: "TEST" });
		transporter.init(new Transit(new ServiceBroker()), msgHandler);		

		let p = transporter.connect();
		transporter._client.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		let subCb;
		transporter.client.subscribe = jest.fn((name, cb) => subCb = cb);

		transporter.subscribe("REQ", "node");

		expect(transporter.client.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.client.subscribe).toHaveBeenCalledWith("TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data", null, "prefix,test,name");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check publish", () => {
		transporter.client.publish.mockClear();
		transporter.publish(new PacketInfo(fakeTransit, "node2", { services: {} }));

		expect(transporter.client.publish).toHaveBeenCalledTimes(1);
		expect(transporter.client.publish).toHaveBeenCalledWith("TEST.INFO.node2", "{\"sender\":\"node1\",\"services\":\"{}\"}");
	});
});
