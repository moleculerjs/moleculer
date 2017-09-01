const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const FakeTransporter = require("../../../src/transporters/fake");
const { PacketInfo } = require("../../../src/packets");

const { isPromise } = require("../../../src/utils");


describe("Test FakeTransporter", () => {

	const fakeTransit = {
		nodeID: "node1",
		serialize: jest.fn(msg => JSON.stringify(msg))
	};

	it("check constructor", () => {
		let transporter = new FakeTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.bus).toBeDefined();
	});

	it("check connect", () => {
		let transporter = new FakeTransporter();
		let p = transporter.connect();
		expect(isPromise(p)).toBe(true);
		expect(transporter.connected).toBe(true);
		return p;
	});

	it("check disconnect", () => {
		let transporter = new FakeTransporter();
		transporter.disconnect();
		expect(transporter.connected).toBe(false);
	});

	it("check subscribe", () => {
		let opts = {};
		let msgHandler = jest.fn();
		let transporter = new FakeTransporter(opts);
		transporter.init(new Transit(new ServiceBroker({ namespace: "TEST" })), msgHandler);

		let subCb;
		transporter.bus.on = jest.fn((name, cb) => subCb = cb);

		transporter.subscribe("REQ", "node");

		expect(transporter.bus.on).toHaveBeenCalledTimes(1);
		expect(transporter.bus.on).toHaveBeenCalledWith("MOL-TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		//subCb.call({ event: "event.test.name" }, "incoming data");
		subCb("incoming data");
		expect(msgHandler).toHaveBeenCalledTimes(1);
		//expect(msgHandler).toHaveBeenCalledWith(["test", "name"], "incoming data");
		expect(msgHandler).toHaveBeenCalledWith("REQ", "incoming data");
	});

	it("check publish", () => {
		let transporter = new FakeTransporter();
		transporter.init(new Transit(new ServiceBroker()));
		transporter.bus.emit = jest.fn();

		transporter.publish(new PacketInfo(fakeTransit, "node2", { services: {} }));

		expect(transporter.bus.emit).toHaveBeenCalledTimes(1);
		expect(transporter.bus.emit).toHaveBeenCalledWith("MOL.INFO.node2", "{\"ver\":\"2\",\"sender\":\"node1\",\"services\":{}}");
	});

});
