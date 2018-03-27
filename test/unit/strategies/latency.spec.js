"use strict";

let LatencyStrategy = require("../../../src/strategies/latency");
let { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test LatencyStrategy", () => {

	it("test with empty opts", () => {

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {}
			}
		});

		expect(strategy.opts.sampleCount).toBe(3);
		expect(strategy.opts.lowLatency).toBe(10);

		const list = [
			{ a: "hello", node: { latency: 20 } },
			{ b: "world", node: { latency: 5 } },
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
	});

	it("test with options", () => {

		let strategy = new LatencyStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
					lowLatency: 30
				}
			}
		});

		expect(strategy.opts.sampleCount).toBe(5);
		expect(strategy.opts.lowLatency).toBe(30);

		let list = [
			{ a: "hello", node: { latency: 25 } },
			{ b: "world", node: { latency: 60 } },
		];

		expect(strategy.select(list)).toBe(list[0]);
		expect(strategy.select(list)).toBe(list[0]);
		expect(strategy.select(list)).toBe(list[0]);

		list = [
			{ a: "hello", node: { latency: 0 } },
			{ b: "world", node: { latency: 32 } },
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
	});

	it("test without latency values", () => {

		let strategy = new LatencyStrategy({
			opts: {}
		});

		const list = [
			{ a: "hello", node: { latency: 0 } },
			{ b: "world", node: { latency: 0 } },
		];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
	});

	it("test with many nodes (random selection)", () => {

		let strategy = new LatencyStrategy({
			opts: {}
		});

		const list = [
			{ node: { latency: 34 } },
			{ node: { latency: 22 } },
			{ node: { latency: 75 } },
			{ node: { latency: 8 } },
			{ node: { latency: 37 } },
			{ node: { latency: 55 } },
			{ node: { latency: 14 } },
		];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
	});

});
