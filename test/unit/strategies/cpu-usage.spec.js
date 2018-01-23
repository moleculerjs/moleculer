"use strict";

let CpuUsageStrategy = require("../../../src/strategies/cpu-usage");
let { extendExpect } = require("../utils");

extendExpect(expect);

describe("Test CpuUsageStrategy", () => {

	it("test with empty opts", () => {

		let strategy = new CpuUsageStrategy({
			opts: {
				strategyOptions: {}
			}
		});

		expect(strategy.opts.sampleCount).toBe(3);
		expect(strategy.opts.lowCpuUsage).toBe(10);

		const list = [
			{ a: "hello", node: { cpu: 50 } },
			{ b: "world", node: { cpu: 20 } },
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
	});

	it("test with options", () => {

		let strategy = new CpuUsageStrategy({
			opts: {
				strategyOptions: {
					sampleCount: 5,
					lowCpuUsage: 30
				}
			}
		});

		expect(strategy.opts.sampleCount).toBe(5);
		expect(strategy.opts.lowCpuUsage).toBe(30);

		let list = [
			{ a: "hello", node: { cpu: 25 } },
			{ b: "world", node: { cpu: 32 } },
		];

		expect(strategy.select(list)).toBe(list[0]);
		expect(strategy.select(list)).toBe(list[0]);
		expect(strategy.select(list)).toBe(list[0]);

		list = [
			{ a: "hello", node: { cpu: null } },
			{ b: "world", node: { cpu: 32 } },
		];

		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
		expect(strategy.select(list)).toBe(list[1]);
	});

	it("test without cpu values", () => {

		let strategy = new CpuUsageStrategy({
			opts: {}
		});

		const list = [
			{ a: "hello", node: { cpu: null } },
			{ b: "world", node: { cpu: null } },
		];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
	});

	it("test with many nodes (random selection)", () => {

		let strategy = new CpuUsageStrategy({
			opts: {}
		});

		const list = [
			{ node: { cpu: 34 } },
			{ node: { cpu: 22 } },
			{ node: { cpu: 75 } },
			{ node: { cpu: 8 } },
			{ node: { cpu: 37 } },
			{ node: { cpu: 55 } },
			{ node: { cpu: 14 } },
		];

		expect(strategy.select(list)).toBeAnyOf(list);
		expect(strategy.select(list)).toBeAnyOf(list);
	});

});
