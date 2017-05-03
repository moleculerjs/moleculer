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
		let transporter = new NatsTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({});
		expect(transporter.connected).toBe(false);
		expect(transporter.client).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new NatsTransporter("nats://localhost");
		expect(transporter.opts).toEqual({ nats: "nats://localhost"});
	});

	it("check constructor with options", () => {
		let opts = { nats: { host: "localhost", port: 1234} };
		let transporter = new NatsTransporter(opts);
		expect(transporter.opts).toBe(opts);
	});
});

describe("Test NatsTransporter connect & disconnect & reconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new NatsTransporter();
		transporter.init(broker, msgHandler);
	});

	it("check connect", () => {
		let p = transporter.connect().then(() => {
			expect(transporter.client).toBeDefined();
			expect(transporter.client.on).toHaveBeenCalledTimes(3);
			expect(transporter.client.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.client.on).toHaveBeenCalledWith("close", jasmine.any(Function));
		});

		transporter.client.onCallbacks.connect();

		return p;
	});

	it("check disconnect", () => {
		transporter.connect();

		let cb = transporter.client.close;
		transporter.disconnect();
		expect(transporter.client).toBeNull();
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it("check reconnect", () => {
		let clock = lolex.install();

		transporter.connect = jest.fn();

		transporter.reconnectAfterTime();

		clock.tick(5500);

		expect(transporter.connect).toHaveBeenCalledTimes(1);

		clock.uninstall();
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
		transporter = new NatsTransporter({ prefix: "TEST" });
		let broker = new ServiceBroker();
		msgHandler = jest.fn();
		transporter.init(broker, msgHandler);
		transporter.connect();
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
		transporter.publish(new PacketInfo(fakeTransit, "node2", {}));

		expect(transporter.client.publish).toHaveBeenCalledTimes(1);
		expect(transporter.client.publish).toHaveBeenCalledWith("TEST.INFO.node2", "{\"sender\":\"node1\",\"actions\":\"{}\"}");
	});
});
