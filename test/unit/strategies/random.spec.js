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

		const selected = strategy.select(list);

		expect(selected).toBeAnyOf(list);
		expect(selected).toBeAnyOf(list);
		expect(selected).toBeAnyOf(list);

	});

});
