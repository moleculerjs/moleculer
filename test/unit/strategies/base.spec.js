"use strict";

const { BaseStrategy } = require("../../../src/strategies");
const ServiceBroker = require("../../../src/service-broker");

describe("Test BaseStrategy", () => {

	it("strategy must initialize broker", () => {
		const strategy = new BaseStrategy();
		const broker = new ServiceBroker({
			registry: {
				strategy,
			}
		});
		expect(broker.options.registry.strategy.getBroker()).toBe(broker);
	});

	it("broker should initialize strategy", () => {

		const strategy = new BaseStrategy();
		strategy.init = jest.fn();

		new ServiceBroker({
			registry: {
				strategy,
			}
		});

		expect(strategy.init).toHaveBeenCalled();
	});

});
