"use strict";

const BaseStrategy = require("../../../src/strategies/base");
const ServiceBroker = require("../../../src/service-broker");

describe("Test BaseStrategy", () => {
	const broker = new ServiceBroker({ logger: false });

	it("should load local variables", () => {
		const strategy = new BaseStrategy(broker.registry, broker);

		expect(strategy.registry).toBe(broker.registry);
		expect(strategy.broker).toBe(broker);
		expect(strategy.opts).toEqual({});

		expect(strategy.select).toBeInstanceOf(Function);
	});

	it("should load with options", () => {
		const opts = { a: 5 };
		const strategy = new BaseStrategy(broker.registry, broker, opts);

		expect(strategy.registry).toBe(broker.registry);
		expect(strategy.broker).toBe(broker);
		expect(strategy.opts).toBe(opts);

		expect(strategy.select).toBeInstanceOf(Function);
	});

});
