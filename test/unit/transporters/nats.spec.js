const ServiceBroker = require("../../../src/service-broker");

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
		let trans = new NatsTransporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toEqual({});
		expect(trans.connected).toBe(false);
		expect(trans.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let trans = new NatsTransporter("nats://localhost");
		expect(trans.opts).toEqual({ nats: "nats://localhost"});
	});

	it("check constructor with options", () => {
		let opts = { nats: { host: "localhost", port: 1234} };
		let trans = new NatsTransporter(opts);
		expect(trans.opts).toBe(opts);
	});
});

describe("Test NatsTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let trans;

	beforeEach(() => {
		trans = new NatsTransporter();
		trans.init(broker, msgHandler);
	});

	it("check connect", () => {
		let p = trans.connect().then(() => {
			expect(trans.client).toBeDefined();
			expect(trans.client.on).toHaveBeenCalledTimes(3);
			expect(trans.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(trans.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(trans.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
		});

		trans.client.onCallbacks.connect();

		return p;
	});

	it("check disconnect", () => {
		trans.connect();

		let cb = trans.client.close;
		trans.disconnect();
		expect(trans.client).toBeNull();
		expect(cb).toHaveBeenCalledTimes(1);
	});
});

describe("Test NatsTransporter subscribe & publish", () => {
	let trans;
	let msgHandler;

	beforeEach(() => {
		trans = new NatsTransporter({ prefix: "TEST" });
		let broker = new ServiceBroker();
		msgHandler = jest.fn();
		trans.init(broker, msgHandler);
		trans.connect();
	});

	it("check subscribe", () => {
		let subCb;
		trans.client.subscribe = jest.fn((name, cb) => subCb = cb);

		trans.subscribe(["REQ", "node"]);

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith(["TEST", "REQ", "node"], jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data", null, "prefix,test,name");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith(["test", "name"], "incoming data");
	});

	it("check publish", () => {
		trans.publish(["REQ", "node"], "data");

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith(["TEST", "REQ", "node"], "data");
	});
});
