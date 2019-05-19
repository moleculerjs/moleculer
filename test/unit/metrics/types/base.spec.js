const MetricRegistry = require("../../../../src/metrics/registry");
const BaseMetric = require("../../../../src/metrics/types/base");

describe("Test Base Metric class", () => {

	describe("Test Constructor", () => {

		const registry = { opts: {
			defaultAggregator: "sum"
		} };

		it("should create with base options", () => {
			const item = new BaseMetric({
				type: "counter",
				name: "test.counter"
			}, registry);

			expect(item.registry).toBe(registry);
			expect(item.type).toBe("counter");
			expect(item.name).toBe("test.counter");
			expect(item.description).toBeUndefined();
			expect(item.labelNames).toEqual([]);
			expect(item.unit).toBeUndefined();
			expect(item.aggregator).toBe("sum");

			expect(item.lastSnapshot).toBeNull();
			expect(item.dirty).toBe(true);

			expect(item.values).toBeInstanceOf(Map);

		});

		it("should create with all options", () => {
			const item = new BaseMetric({
				type: "gauge",
				name: "test.gauge",
				description: "Test gauge",
				labelNames: ["action", "service"],
				unit: "bytes",
				aggregator: "avg"
			}, registry);

			expect(item.registry).toBe(registry);
			expect(item.type).toBe("gauge");
			expect(item.name).toBe("test.gauge");
			expect(item.description).toBe("Test gauge");
			expect(item.labelNames).toEqual(["action", "service"]);
			expect(item.unit).toBe("bytes");
			expect(item.aggregator).toBe("avg");

			expect(item.lastSnapshot).toBeNull();
			expect(item.dirty).toBe(true);

			expect(item.values).toBeInstanceOf(Map);

		});
	});

	describe("Test setDirty & clearDirty", () => {

		const registry = { opts: {
			defaultAggregator: "sum"
		} };

		const item = new BaseMetric({
			type: "counter",
			name: "test.counter"
		}, registry);

		it("should clear dirty flag", () => {
			expect(item.dirty).toBe(true);
			item.clearDirty();
			expect(item.dirty).toBe(false);
			item.setDirty();
			expect(item.dirty).toBe(true);
		});
	});

	describe("Test hashingLabels", () => {

		const registry = { opts: {
			defaultAggregator: "sum"
		} };

		it("should create empty hash because labels are not defined", () => {
			const item = new BaseMetric({ type: "counter", name: "test.counter" }, registry);

			expect(item.hashingLabels()).toBe("");
			expect(item.hashingLabels({ a: 5 })).toBe("");
			expect(item.hashingLabels({ a: 5, b: "John", c: null, d: false })).toBe("");
		});

		it("should create limited hash because labels are not defined", () => {
			const item = new BaseMetric({ type: "counter", name: "test.counter", labelNames: ["a", "c", "d"] }, registry);

			expect(item.hashingLabels()).toBe("");
			expect(item.hashingLabels({ a: 5 })).toBe("5||");
			expect(item.hashingLabels({ a: 5, c: null, d: false })).toBe("5||false");
			expect(item.hashingLabels({ a: 5, b: "John", c: null, d: false })).toBe("5||false");
		});

		it("should create full hash because labels are not defined", () => {
			const item = new BaseMetric({ type: "counter", name: "test.counter", labelNames: ["a", "b", "c", "d"] }, registry);

			expect(item.hashingLabels()).toBe("");
			expect(item.hashingLabels({ a: 5 })).toBe("5|||");
			expect(item.hashingLabels({ a: 5, b: "John", c: null, d: false })).toBe("5|\"John\"||false");
		});
	});

	describe("Test get & clear method", () => {

		const registry = { opts: {
			defaultAggregator: "sum"
		} };

		const item = new BaseMetric({ type: "counter", name: "test.counter", labelNames: ["a", "b"] }, registry);

		it("should return the correct values", () => {
			const hash = item.hashingLabels({ a: 5, b: "John", c: null, d: false });
			const hash2 = item.hashingLabels({ a: 6, b: "Jane" });
			item.values.set(hash, 12345);
			item.values.set(hash2, 67890);

			expect(item.get({ a: 5, b: "John", c: null, d: false })).toBe(12345);
			expect(item.get({ a: 6, b: "Jane", c: null, d: false })).toBe(67890);
		});

		it("should clear all values", () => {
			item.changed = jest.fn();

			expect(item.values.size).toBe(2);
			item.clear();

			expect(item.values.size).toBe(0);
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith();
		});
	});

	describe("Test snapshot method", () => {

		const registry = { opts: {
			defaultAggregator: "sum"
		} };

		const item = new BaseMetric({ type: "counter", name: "test.counter" }, registry);
		item.generateSnapshot = jest.fn(() => "snapshot");
		item.clearDirty = jest.fn();

		it("should call generateSnapshot", () => {
			expect(item.lastSnapshot).toBeNull();

			expect(item.snapshot()).toBe("snapshot");
			expect(item.generateSnapshot).toBeCalledTimes(1);
			expect(item.clearDirty).toBeCalledTimes(1);
			expect(item.lastSnapshot).toBe("snapshot");
		});

		it("should not call generateSnapshot", () => {
			item.generateSnapshot.mockClear();
			item.clearDirty.mockClear();

			expect(item.snapshot()).toBe("snapshot");
			expect(item.generateSnapshot).toBeCalledTimes(1);
			expect(item.clearDirty).toBeCalledTimes(1);
			expect(item.lastSnapshot).toBe("snapshot");
		});
	});

	describe("Test changed method", () => {

		const registry = {
			changed: jest.fn(),
			opts: {
				defaultAggregator: "sum"
			}
		};

		const item = new BaseMetric({ type: "counter", name: "test.counter" }, registry);
		item.setDirty = jest.fn();

		it("should call setDirty & registry.changed", () => {
			const labels = { a: 6, b: "Jane" };
			item.changed(labels);

			expect(item.setDirty).toBeCalledTimes(1);
			expect(registry.changed).toBeCalledTimes(1);
			expect(registry.changed).toBeCalledWith(item, labels);
		});

	});

});
