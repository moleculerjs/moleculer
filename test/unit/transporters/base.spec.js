const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const BaseTransporter = require("../../../src/transporters/base");


describe("Test BaseTransporter", () => {

	it("check constructor", () => {
		let trans = new BaseTransporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toBeDefined();
		expect(trans.connected).toBe(false);
		expect(trans.prefix).toBe("MOL");

		expect(trans.init).toBeDefined();
		expect(trans.connect).toBeDefined();
		expect(trans.onConnected).toBeDefined();
		expect(trans.disconnect).toBeDefined();
		expect(trans.subscribe).toBeDefined();
		expect(trans.publish).toBeDefined();
	});

	it("check constructor with options", () => {
		let opts = { prefix: "TEST" };
		let trans = new BaseTransporter(opts);
		expect(trans).toBeDefined();
		expect(trans.opts).toBe(opts);
		expect(trans.prefix).toBe("TEST");
	});

	it("check init", () => {
		let broker = new ServiceBroker({ nodeID: "server1" });
		let trans = new BaseTransporter();
		let transit = new Transit(broker, trans);
		let handler = jest.fn();

		trans.init(transit, handler);
		expect(trans.transit).toBe(transit);
		expect(trans.broker).toBe(broker);
		expect(trans.nodeID).toBe("server1");
		expect(trans.logger).toBeDefined();
		expect(trans.messageHandler).toBe(handler);
	});

	it("check onConnected", () => {
		let broker = new ServiceBroker({ nodeID: "server1" });
		let trans = new BaseTransporter();
		let transit = new Transit(broker, trans);
		transit.afterConnect = jest.fn();

		expect(trans.connected).toBe(false);

		trans.init(transit);

		trans.onConnected();
		expect(trans.connected).toBe(true);
		expect(transit.afterConnect).toHaveBeenCalledTimes(1);

		transit.afterConnect.mockClear();
		trans.onConnected(true);
		expect(transit.afterConnect).toHaveBeenCalledTimes(1);
		expect(transit.afterConnect).toHaveBeenCalledWith(true);
	});
});
