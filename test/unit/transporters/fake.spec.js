const ServiceBroker = require("../../../src/service-broker");
const FakeTransporter = require("../../../src/transporters/fake");

const { isPromise } = require("../../../src/utils");


describe("Test FakeTransporter", () => {

	it("check constructor", () => {
		let trans = new FakeTransporter();
		expect(trans).toBeDefined();
		expect(trans.bus).toBeDefined();
	});

	it("check connect", () => {
		let trans = new FakeTransporter();
		let p = trans.connect();
		expect(isPromise(p)).toBe(true);
		expect(trans.connected).toBe(true);
		return p;
	});	

	it("check disconnect", () => {
		let trans = new FakeTransporter();
		trans.disconnect();
		expect(trans.connected).toBe(false);
	});	

	it("check subscribe", () => {
		let opts = { prefix: "TEST" };
		let msgHandler = jest.fn();
		let trans = new FakeTransporter(opts);
		let broker = new ServiceBroker();
		trans.init(broker, msgHandler);

		let subCb;
		trans.bus.on = jest.fn((name, cb) => subCb = cb);

		trans.subscribe(["REQ", "node"]);

		expect(trans.bus.on).toHaveBeenCalledTimes(1);
		expect(trans.bus.on).toHaveBeenCalledWith("TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		//subCb.call({ event: "event.test.name" }, "incoming data");
		subCb("incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		//expect(msgHandler).toHaveBeenCalledWith(["test", "name"], "incoming data");
		expect(msgHandler).toHaveBeenCalledWith(["REQ", "node"], "incoming data");
	});

	it("check publish", () => {
		let trans = new FakeTransporter();
		trans.bus.emit = jest.fn();

		trans.publish(["REQ", "node"], "data");

		expect(trans.bus.emit).toHaveBeenCalledTimes(1);
		expect(trans.bus.emit).toHaveBeenCalledWith("MOL.REQ.node", "data");
	});

});
