"use strict";

const RandomStrategy = require("../../../src/strategies/random");
const { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test RandomStrategy", () => {
	it("test with empty opts", () => {
		const strategy = new RandomStrategy();

		const list = [{ a: "hello" }, { b: "world" }];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
	});
});
