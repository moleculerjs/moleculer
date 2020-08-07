const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const FakeTransporter = require("../../../src/transporters/fake");
const P = require("../../../src/packets");

const { isPromise } = require("../../../src/utils");


describe("Test FakeTransporter", () => {
	const broker = new ServiceBroker({ logger: false });
	const transit = new Transit(broker);

	it("check constructor", () => {
		const transporter = new FakeTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.bus).toBeDefined();
	});

	it("check connect", () => {
		const transporter = new FakeTransporter();
		transporter.init(transit);
		let p = transporter.connect();
		expect(isPromise(p)).toBe(true);
		expect(transporter.connected).toBe(true);
		return p;
	});

	it("check disconnect", () => {
		const transporter = new FakeTransporter();
		transporter.init(transit);
		transporter.disconnect();
		expect(transporter.connected).toBe(false);
	});

	it("check subscribe", () => {
		const opts = {};
		const msgHandler = jest.fn();
		const transporter = new FakeTransporter(opts);
		broker.namespace = "TEST";
		transporter.init(transit, msgHandler);

		let subCb;
		transporter.bus.on = jest.fn((name, cb) => subCb = cb);
		transporter.incomingMessage = jest.fn();

		transporter.subscribe("REQ", "node");

		expect(transporter.bus.on).toHaveBeenCalledTimes(1);
		expect(transporter.bus.on).toHaveBeenCalledWith("MOL-TEST.REQ.node", jasmine.any(Function));

		// Test subscribe callback
		subCb("{ sender: \"node1\" }");
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("REQ", "{ sender: \"node1\" }");

	});

	it("check publish", () => {
		const transporter = new FakeTransporter();
		transporter.init(new Transit(new ServiceBroker({ logger: false, nodeID: "node1" })));
		transporter.bus.emit = jest.fn();
		transporter.serialize = jest.fn(() => "serialized data");

		const packet = new P.Packet(P.PACKET_INFO, "node2", { services: {} });
		transporter.publish(packet);

		expect(transporter.bus.emit).toHaveBeenCalledTimes(1);
		expect(transporter.bus.emit).toHaveBeenCalledWith("MOL.INFO.node2", "serialized data");

		expect(transporter.serialize).toHaveBeenCalledTimes(1);
		expect(transporter.serialize).toHaveBeenCalledWith(packet);

	});

});
