"use strict";

let RandomStrategy = require("../../../src/strategies/random");

expect.extend({
	toBeAnyOf(received, expected) {

		let pass = false;
		for (const item of expected) {
			if (received === item) {
				pass = true;
				break;
			}
		}

		let list = expected
			.map(item => item.toString())
			.join(", ");
		let message = `Expected ${received.toString()} to be any of [${list}]`;

		return {
			actual: received,
			message,
			pass
		};
	},
});

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
