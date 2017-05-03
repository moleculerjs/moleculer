const ServiceBroker = require("../../../src/service-broker");
const { PacketInfo } = require("../../../src/packets");

const lolex = require("lolex");

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

describe("Test NatsTransporter connect & disconnect & reconnect", () => {
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

	it("check reconnect", () => {
		let clock = lolex.install();

		trans.connect = jest.fn();

		trans.reconnectAfterTime();

		clock.tick(5500);

		expect(trans.connect).toHaveBeenCalledTimes(1);

		clock.uninstall();
	});
});

describe("Test NatsTransporter subscribe & publish", () => {
	let trans;
	let msgHandler;

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};	

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

		trans.subscribe("REQ", "node");

		expect(trans.client.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.client.subscribe).toHaveBeenCalledWith("TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		subCb("incoming data", null, "prefix,test,name");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check publish", () => {
		trans.publish(new PacketInfo(fakeTransit, "node2", {}));

		expect(trans.client.publish).toHaveBeenCalledTimes(1);
		expect(trans.client.publish).toHaveBeenCalledWith("TEST.INFO.node2", "{\"sender\":\"node1\",\"actions\":\"{}\"}");
	});
});
