const ServiceBroker = require("../../../src/service-broker");
const RedisTransporter = require("../../../src/transporters/redis");

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

// Unit: OK!
describe("Test NatsTransporter constructor", () => {

	it("check constructor", () => {
		let trans = new RedisTransporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toEqual({});
		expect(trans.connected).toBe(false);
		expect(trans.clientPub).toBeNull();
		expect(trans.clientSub).toBeNull();
	});

	it("check constructor with string param", () => {
		let trans = new RedisTransporter("redis://localhost");
		expect(trans.opts).toEqual({ redis: "redis://localhost"});
	});

	it("check constructor with options", () => {
		let opts = { redis: { host: "localhost", port: 1234} };
		let trans = new RedisTransporter(opts);
		expect(trans.opts).toBe(opts);
	});
});

describe("Test RedisTransporter connect & disconnect", () => {
	let broker = new ServiceBroker();
	let msgHandler = jest.fn();
	let trans;

	beforeEach(() => {
		trans = new RedisTransporter();
		trans.init(broker, msgHandler);
	});

	it("check connect", () => {
		let p = trans.connect().then(() => {
			expect(trans.clientSub).toBeDefined();
			expect(trans.clientSub.on).toHaveBeenCalledTimes(4);
			expect(trans.clientSub.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(trans.clientSub.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(trans.clientSub.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(trans.clientSub.on).toHaveBeenCalledWith("message", jasmine.any(Function));

			expect(trans.clientPub).toBeDefined();
			expect(trans.clientPub.on).toHaveBeenCalledTimes(3);
			expect(trans.clientPub.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(trans.clientPub.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(trans.clientPub.on).toHaveBeenCalledWith("close", jasmine.any(Function));
		});

		trans.clientSub.onCallbacks.connect();
		trans.clientPub.onCallbacks.connect();

		return p;
	});

	it("check disconnect", () => {
		trans.connect();

		let cbSub = trans.clientSub.disconnect;
		let cbPub = trans.clientPub.disconnect;
		trans.disconnect();
		expect(trans.clientSub).toBeNull();
		expect(trans.clientPub).toBeNull();
		expect(cbSub).toHaveBeenCalledTimes(1);
		expect(cbPub).toHaveBeenCalledTimes(1);
	});

});


describe("Test NatsTransporter subscribe & publish", () => {
	let trans;
	let msgHandler;

	beforeEach(() => {
		trans = new RedisTransporter({ prefix: "TEST" });
		let broker = new ServiceBroker();
		msgHandler = jest.fn();
		trans.init(broker, msgHandler);
		trans.connect();
	});

	it("check subscribe", () => {
		trans.subscribe(["REQ", "node"]);

		expect(trans.clientSub.subscribe).toHaveBeenCalledTimes(1);
		expect(trans.clientSub.subscribe).toHaveBeenCalledWith("TEST.REQ.node");
	});

	it("check incoming message handler", () => {
		// Test subscribe callback
		trans.clientSub.onCallbacks.message("prefix.event.name", "incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith(["event", "name"], "incoming data");
	});

	it("check publish", () => {
		trans.publish(["REQ", "node"], "data");

		expect(trans.clientPub.publish).toHaveBeenCalledTimes(1);
		expect(trans.clientPub.publish).toHaveBeenCalledWith("TEST.REQ.node", "data");
	});
});
