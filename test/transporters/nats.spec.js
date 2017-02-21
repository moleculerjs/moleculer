const ServiceBroker = require("../../src/service-broker");

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

const NatsTransporter = require("../../src/transporters/nats");

describe("Test NatsTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let trans;

	beforeEach(() => {
		trans = new NatsTransporter();
		trans.init(broker, msgHandler);
	});

	it("check constructor", () => {
		expect(trans).toBeDefined();
		expect(trans.connected).toBeFalsy();
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

	it("check subscribe", () => {
		let opts = { prefix: "TEST" };
		let msgHandler = jest.fn();
		let trans = new NatsTransporter(opts);
		let broker = new ServiceBroker();
		trans.init(broker, msgHandler);
		trans.connect();

		let subCb;
		trans.client.subscribe = jest.fn((name, cb) => subCb = cb);

		trans.subscribe(["REQ", "node"]);

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith(["TEST", "REQ", "node"], jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data", null, ["prefix", "test", "name"]);
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith(["test", "name"], "incoming data");
	});

	it("check publish", () => {
		let msgHandler = jest.fn();
		let trans = new NatsTransporter();
		trans.init(new ServiceBroker(), msgHandler);
		trans.connect();

		trans.publish(["REQ", "node"], "data");

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith(["MOL", "REQ", "node"], "data");
	});
});
