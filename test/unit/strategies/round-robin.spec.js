"use strict";

const RoundRobinStrategy = require("../../../src/strategies/round-robin");

describe("Test RoundRobinStrategy", () => {

	it("get endpoint in order", () => {

		let strategy = new RoundRobinStrategy();
		expect(strategy.counter).toBe(0);

		const list = [
			{ a: "hello" },
			{ b: "world" },
		];

		let value = strategy.select(list);
		expect(strategy.counter).toBe(1);
		expect(value).toBe(list[0]);

		value = strategy.select(list);
		expect(strategy.counter).toBe(2);
		expect(value).toBe(list[1]);

		value = strategy.select(list);
		expect(strategy.counter).toBe(1);
		expect(value).toBe(list[0]);

		value = strategy.select(list);
		expect(strategy.counter).toBe(2);
		expect(value).toBe(list[1]);

	});

});
