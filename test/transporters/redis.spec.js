const ServiceBroker = require("../../src/service-broker");
const RedisTransporter = require("../../src/transporters/redis");

jest.mock("ioredis");

describe("Test RedisTransporter", () => {

	it("check constructor", () => {
		let trans = new RedisTransporter();
		expect(trans).toBeDefined();
		expect(trans.connected).toBeFalsy();
	});

	it.skip("check connect", () => {
		let trans = new RedisTransporter();
		let p = trans.connect().then(() => {
			expect(trans.clientSub).toBeDefined();
			expect(trans.clientPub).toBeDefined();
		});

		trans.clientSub.emit("connect");
		trans.clientPub.emit("connect");

		return p;
	});
/*
	it("check subscribe", () => {
		let opts = { prefix: "TEST" };
		let msgHandler = jest.fn();
		let trans = new RedisTransporter(opts);
		let broker = new ServiceBroker();
		trans.init(broker, msgHandler);

		let subCb;
		trans.bus.on = jest.fn((name, cb) => subCb = cb);

		trans.subscribe(["REQ", "node"]);

		expect(trans.bus.on).toHaveBeenCalledTimes(1);
		expect(trans.bus.on).toHaveBeenCalledWith("TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		subCb.call({ event: "event.test.name" }, "incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		expect(msgHandler).toHaveBeenCalledWith(["test", "name"], "incoming data");
	});

	it("check publish", () => {
		let trans = new RedisTransporter();
		trans.bus.emit = jest.fn();

		trans.publish(["REQ", "node"], "data");

		expect(trans.bus.emit).toHaveBeenCalledTimes(1);
		expect(trans.bus.emit).toHaveBeenCalledWith("MOL.REQ.node", "data");
	});*/
});
