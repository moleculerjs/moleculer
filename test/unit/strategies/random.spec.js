"use strict";

let RandomStrategy = require("../../../src/strategies/random");
let { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test RandomStrategy", () => {

	it("test with empty opts", () => {

		let strategy = new RandomStrategy();

		const list = [
			{ a: "hello" },
			{ b: "world" },
		];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
	});

});
