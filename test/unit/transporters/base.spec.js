const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const BaseTransporter = require("../../../src/transporters/base");


describe("Test BaseTransporter", () => {

	it("check constructor", () => {
		let transporter = new BaseTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toBeDefined();
		expect(transporter.connected).toBe(false);
		expect(transporter.prefix).toBe("MOL");

		expect(transporter.init).toBeDefined();
		expect(transporter.connect).toBeDefined();
		expect(transporter.onConnected).toBeDefined();
		expect(transporter.disconnect).toBeDefined();
		expect(transporter.subscribe).toBeDefined();
		expect(transporter.publish).toBeDefined();
	});

	it("check constructor with options", () => {
		let opts = { prefix: "TEST" };
		let transporter = new BaseTransporter(opts);
		expect(transporter).toBeDefined();
		expect(transporter.opts).toBe(opts);
		expect(transporter.prefix).toBe("TEST");
	});

	it("check init", () => {
		let broker = new ServiceBroker({ nodeID: "server1" });
		let transporter = new BaseTransporter();
		let transit = new Transit(broker, transporter);
		let handler = jest.fn();
		let handler2 = jest.fn();

		transporter.init(transit, handler, handler2);
		expect(transporter.transit).toBe(transit);
		expect(transporter.broker).toBe(broker);
		expect(transporter.nodeID).toBe("server1");
		expect(transporter.logger).toBeDefined();
		expect(transporter.messageHandler).toBe(handler);
		expect(transporter.afterConnect).toBe(handler2);
	});

	it("check onConnected", () => {
		let transporter = new BaseTransporter();
		let afterConnect = jest.fn();

		expect(transporter.connected).toBe(false);

		transporter.init(null, null, afterConnect);

		transporter.onConnected();
		expect(transporter.connected).toBe(true);
		expect(afterConnect).toHaveBeenCalledTimes(1);

		afterConnect.mockClear();
		transporter.onConnected(true);
		expect(afterConnect).toHaveBeenCalledTimes(1);
		expect(afterConnect).toHaveBeenCalledWith(true);
	});
});
