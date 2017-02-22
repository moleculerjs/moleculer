const ServiceBroker = require("../../src/service-broker");
const BaseTransporter = require("../../src/transporters/base");

describe("Test BaseTransporter", () => {

	it("check constructor", () => {
		let trans = new BaseTransporter();
		expect(trans).toBeDefined();
		expect(trans.opts).toBeDefined();
		expect(trans.connected).toBeFalsy();
		expect(trans.prefix).toBe("MOL");

		expect(trans.init).toBeDefined();
		expect(trans.connect).toBeDefined();
		expect(trans.disconnect).toBeDefined();
		expect(trans.subscribe).toBeDefined();
		expect(trans.publish).toBeDefined();
	});

	it("check constructor with options", () => {
		let opts = { prefix: "TEST" };
		let trans = new BaseTransporter(opts);
		expect(trans).toBeDefined();
		expect(trans.opts).toBe(opts);
		expect(trans.connected).toBeFalsy();
		expect(trans.prefix).toBe("TEST");

		expect(trans.init).toBeDefined();
		expect(trans.connect).toBeDefined();
		expect(trans.disconnect).toBeDefined();
		expect(trans.subscribe).toBeDefined();
		expect(trans.publish).toBeDefined();
	});

	it("check init", () => {
		let broker = new ServiceBroker({ nodeID: "server1" });
		let trans = new BaseTransporter();
		let handler = jest.fn();

		trans.init(broker, handler);
		expect(trans.broker).toBe(broker);
		expect(trans.nodeID).toBe("server1");
		expect(trans.logger).toBeDefined();
		expect(trans.messageHandler).toBe(handler);
	});
});
