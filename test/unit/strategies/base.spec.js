"use strict";

const BaseStrategy = require("../../../src/strategies/base");
const ServiceBroker = require("../../../src/service-broker");

describe("Test BaseStrategy", () => {
	const broker = new ServiceBroker();

	it("should load propertes", () => {
		const strategy = new BaseStrategy(broker.registry, broker);

		expect(strategy.registry).toBe(broker.registry);
		expect(strategy.broker).toBe(broker);

		expect(strategy.select).toBeInstanceOf(Function);
	});

});
