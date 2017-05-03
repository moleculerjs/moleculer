const ServiceBroker = require("../../../src/service-broker");
const RedisTransporter = require("../../../src/transporters/redis");
const { PacketInfo } = require("../../../src/packets");

jest.mock("ioredis");

let Redis = require("ioredis");
Redis.mockImplementation(() => {
	let onCallbacks = {};
	return {
		on: jest.fn((event, cb) => onCallbacks[event] = cb),
		disconnect: jest.fn(),
		subscribe: jest.fn(),
		publish: jest.fn(),

		onCallbacks
	};
});


describe("Test NatsTransporter constructor", () => {

	it("check constructor", () => {
		let transporter = new RedisTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toEqual({});
		expect(transporter.connected).toBe(false);
		expect(transporter.clientPub).toBeNull();
		expect(transporter.clientSub).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new RedisTransporter("redis://localhost");
		expect(transporter.opts).toEqual({ redis: "redis://localhost"});
	});

	it("check constructor with options", () => {
		let opts = { redis: { host: "localhost", port: 1234} };
		let transporter = new RedisTransporter(opts);
		expect(transporter.opts).toBe(opts);
	});
});

describe("Test RedisTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new RedisTransporter();
		transporter.init(broker, msgHandler);
	});

	it("check connect", () => {
		let p = transporter.connect().then(() => {
			expect(transporter.clientSub).toBeDefined();
			expect(transporter.clientSub.on).toHaveBeenCalledTimes(4);
			expect(transporter.clientSub.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.clientSub.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.clientSub.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(transporter.clientSub.on).toHaveBeenCalledWith("message", jasmine.any(Function));

			expect(transporter.clientPub).toBeDefined();
			expect(transporter.clientPub.on).toHaveBeenCalledTimes(3);
			expect(transporter.clientPub.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.clientPub.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.clientPub.on).toHaveBeenCalledWith("close", jasmine.any(Function));
		});

		transporter.clientSub.onCallbacks.connect();
		transporter.clientPub.onCallbacks.connect();

		return p;
	});

	it("check disconnect", () => {
		transporter.connect();

		let cbSub = transporter.clientSub.disconnect;
		let cbPub = transporter.clientPub.disconnect;
		transporter.disconnect();
		expect(transporter.clientSub).toBeNull();
		expect(transporter.clientPub).toBeNull();
		expect(cbSub).toHaveBeenCalledTimes(1);
		expect(cbPub).toHaveBeenCalledTimes(1);
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
		transporter = new RedisTransporter({ prefix: "TEST" });
		let broker = new ServiceBroker();
		msgHandler = jest.fn();
		transporter.init(broker, msgHandler);
		transporter.connect();
	});

	it("check subscribe", () => {
		transporter.subscribe("REQ", "node");

		expect(transporter.clientSub.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.clientSub.subscribe).toHaveBeenCalledWith("TEST.REQ.node");
	});

	it("check incoming message handler", () => {
		// Test subscribe callback
		transporter.clientSub.onCallbacks.message("prefix.event", "incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith("event", "incoming data");
	});

	it("check publish", () => {
		transporter.publish(new PacketInfo(fakeTransit, "node2", {}));

		expect(transporter.clientPub.publish).toHaveBeenCalledTimes(1);
		expect(transporter.clientPub.publish).toHaveBeenCalledWith("TEST.INFO.node2", "{\"sender\":\"node1\",\"actions\":\"{}\"}");
	});
});
