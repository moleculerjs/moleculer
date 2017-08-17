"use strict";

let BrokerStatistics = require("../../src/statistics");
let ServiceBroker = require("../../src/service-broker");

describe("Test Statistics constructor", () => {
	let broker = new ServiceBroker();

	it("should create default options", () => {
		let stat = new BrokerStatistics(broker);
		expect(stat).toBeDefined();
		expect(stat.broker).toBe(broker);
		expect(stat.options).toEqual({});

		expect(stat.requests).toBeDefined();

		expect(stat.addRequest).toBeInstanceOf(Function);
		expect(stat.snapshot).toBeInstanceOf(Function);
	});
});
