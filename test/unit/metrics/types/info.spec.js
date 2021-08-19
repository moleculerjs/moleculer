"use strict";

const InfoMetric = require("../../../../src/metrics/types/info");

describe("Test Base Metric class", () => {
	const registry = {
		changed: jest.fn(),
		opts: {
			defaultAggregator: "sum"
		}
	};

	describe("Test Constructor", () => {
		it("should create with base options", () => {
			registry.changed.mockClear();
			const item = new InfoMetric(
				{
					type: "info",
					name: "test.info"
				},
				registry
			);

			expect(item.registry).toBe(registry);
			expect(item.type).toBe("info");
			expect(item.name).toBe("test.info");

			expect(registry.changed).toBeCalledTimes(0);
		});
	});

	describe("Test set, reset & resetAll method", () => {
		const item = new InfoMetric(
			{ type: "info", name: "test.info", labelNames: ["a"] },
			registry
		);
		jest.spyOn(item, "changed");

		it("should store a value", () => {
			item.changed.mockClear();
			expect(item.values.size).toBe(0);
			item.set("John");
			expect(item.values.size).toBe(1);
			expect(item.values.get("")).toEqual({
				labels: {},
				timestamp: expect.any(Number),
				value: "John"
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith("John", undefined, undefined);
		});

		it("should store a labeled value", () => {
			item.changed.mockClear();
			expect(item.values.size).toBe(1);
			item.set("Jane", { a: 5 });
			expect(item.values.size).toBe(2);
			expect(item.values.get("5")).toEqual({
				labels: { a: 5 },
				timestamp: expect.any(Number),
				value: "Jane"
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith("Jane", { a: 5 }, undefined);
		});

		it("should update the labeled value", () => {
			item.changed.mockClear();
			expect(item.values.size).toBe(2);
			item.set("Adam", { a: 5 }, 12345);
			expect(item.values.size).toBe(2);
			expect(item.values.get("5")).toEqual({
				labels: { a: 5 },
				timestamp: 12345,
				value: "Adam"
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith("Adam", { a: 5 }, 12345);
		});

		it("should reset the labeled value", () => {
			item.changed.mockClear();
			item.reset({ a: 5 }, 23456);
			expect(item.values.get("5")).toEqual({
				labels: { a: 5 },
				timestamp: 23456,
				value: null
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith(null, { a: 5 }, 23456);
			expect(item.values.size).toBe(2);
		});

		it("should reset all values", () => {
			item.set("Adam", { a: 5 }, 12345); // restore value
			item.changed.mockClear();

			item.resetAll(34567);
			expect(item.values.get("")).toEqual({
				labels: {},
				timestamp: 34567,
				value: null
			});
			expect(item.values.get("5")).toEqual({
				labels: { a: 5 },
				timestamp: 34567,
				value: null
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith();
			expect(item.values.size).toBe(2);
		});
	});

	describe("Test generateSnapshot method", () => {
		const item = new InfoMetric(
			{ type: "info", name: "test.info", labelNames: ["a"] },
			registry
		);

		item.set("John", null, 1111);
		item.set("Jane", { a: 1 }, 2222);
		item.set("Adam", { a: 5 }, 3333);
		item.set("Steve", { a: true }, 4444);

		it("should generate a snapshot", () => {
			expect(item.generateSnapshot()).toMatchSnapshot();
		});
	});
});
