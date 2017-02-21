const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");

describe("Test FakeTransporter", () => {

	it("check constructor", () => {
		let trans = new FakeTransporter();
		expect(trans).toBeDefined();
		expect(trans.connected).toBeTruthy();
		expect(trans.bus).toBeDefined();
	});

	it("check subscribe", () => {
		let opts = { prefix: "TEST" };
		let trans = new FakeTransporter(opts);
		trans.bus.on = jest.fn();

		trans.subscribe(["REQ", "node"]);

		expect(trans.bus.on).toHaveBeenCalledTimes(1);
		expect(trans.bus.on).toHaveBeenCalledWith("TEST.REQ.node", jasmine.any(Function));
	});

	it("check publish", () => {
		let trans = new FakeTransporter();
		trans.bus.emit = jest.fn();

		trans.publish(["REQ", "node"], "data");

		expect(trans.bus.emit).toHaveBeenCalledTimes(1);
		expect(trans.bus.emit).toHaveBeenCalledWith("MOL.REQ.node", "data");
	});
});
