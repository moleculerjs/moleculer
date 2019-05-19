"use strict";

const HistogramMetric = require("../../../../src/metrics/types/histogram");

describe("Test Base Metric class", () => {

	const registry = {
		changed: jest.fn(),
		opts: {
			defaultAggregator: "sum",
			defaultBuckets: [0.1, 0.2, 0.5, 1, 2, 5, 10],
			defaultQuantiles: [0.1, 0.2, 0.5, 0.9, 0.99],
			defaultAgeBuckets: 10,
			defaultMaxAgeSeconds: 60
		}
	};

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			registry.changed.mockClear();
			const item = new HistogramMetric({
				type: "histogram",
				name: "test.histogram"
			}, registry);

			expect(item.registry).toBe(registry);
			expect(item.type).toBe("histogram");
			expect(item.name).toBe("test.histogram");
			expect(item.buckets).toBeUndefined();
			expect(item.quantiles).toBeUndefined();
			expect(item.maxAgeSeconds).toBeUndefined();
			expect(item.ageBuckets).toBeUndefined();

			expect(registry.changed).toBeCalledTimes(1);
		});

		describe("Test with buckets", () => {

			it("should create with default buckets", () => {
				registry.changed.mockClear();
				const item = new HistogramMetric({
					type: "histogram",
					name: "test.histogram",
					buckets: true
				}, registry);

				expect(item.buckets).toEqual([0.1, 0.2, 0.5, 1, 2, 5, 10]);
			});

			it("should create with custom buckets", () => {
				registry.changed.mockClear();
				const item = new HistogramMetric({
					type: "histogram",
					name: "test.histogram",
					buckets: [13, 3, 7, 9, 1]
				}, registry);

				expect(item.buckets).toEqual([1, 3, 7, 9, 13]);
			});

			it("should create with linearBuckets", () => {
				registry.changed.mockClear();
				const item = new HistogramMetric({
					type: "histogram",
					name: "test.histogram",
					linearBuckets: {
						start: 1,
						width: 4,
						count: 5
					}
				}, registry);

				expect(item.buckets).toEqual([1, 5, 9, 13, 17]);
			});

			it("should create with exponentialBuckets", () => {
				registry.changed.mockClear();
				const item = new HistogramMetric({
					type: "histogram",
					name: "test.histogram",
					exponentialBuckets: {
						start: 1,
						factor: 2.5,
						count: 4
					}
				}, registry);

				expect(item.buckets).toEqual([1, 2.5, 6.25, 15.625]);
			});

		});

		describe("Test with quantiles", () => {

			it("should create with default quantiles", () => {
				registry.changed.mockClear();
				const item = new HistogramMetric({
					type: "histogram",
					name: "test.histogram",
					quantiles: true,
					maxAgeSeconds: 60,
					ageBuckets: 10
				}, registry);

				expect(item.quantiles).toEqual([0.1, 0.2, 0.5, 0.9, 0.99]);
			});

			it("should create with custom quantiles", () => {
				registry.changed.mockClear();
				const item = new HistogramMetric({
					type: "histogram",
					name: "test.histogram",
					quantiles: [0.9, 0.6, 0.4, 0.2, 0.15],
					maxAgeSeconds: 30,
					ageBuckets: 5
				}, registry);

				expect(item.quantiles).toEqual([0.15, 0.2, 0.4, 0.6, 0.9]);
			});

		});

	});

	describe("Test observe method", () => {

		describe("Test without buckets & quantiles", () => {

			const item = new HistogramMetric({ type: "histogram", name: "test.histogram" }, registry);

			it("should store values", () => {
				const now = Date.now();
				item.observe(100, null, now);
				expect(item.values.get("")).toEqual({
					count: 1,
					labels: {},
					sum: 100,
					timestamp: now
				});
			});

			it("should sum values", () => {
				const now = Date.now();
				item.observe(250, null, now);
				expect(item.values.get("")).toEqual({
					count: 2,
					labels: {},
					sum: 350,
					timestamp: now
				});
			});

		});

		describe("Test with buckets", () => {

			const item = new HistogramMetric({ type: "histogram", name: "test.histogram", buckets: [1, 2, 5, 10, 20, 50] }, registry);

			it("should store values", () => {
				const now = Date.now();
				item.observe(2, null, now);
				expect(item.values.get("")).toEqual({
					count: 1,
					labels: {},
					sum: 2,
					timestamp: now,
					bucketValues: {
						"1": 0,
						"2": 1,
						"5": 1,
						"10": 1,
						"20": 1,
						"50": 1,
					}
				});
			});

			it("should sum values", () => {
				const now = Date.now();
				item.observe(13, null, now);
				expect(item.values.get("")).toEqual({
					count: 2,
					labels: {},
					sum: 15,
					timestamp: now,
					bucketValues: {
						"1": 0,
						"2": 1,
						"5": 1,
						"10": 1,
						"20": 2,
						"50": 2,
					}
				});
			});

		});

		describe("Test with quantiles", () => {

			const item = new HistogramMetric({ type: "histogram", name: "test.histogram", quantiles: [0.1, 0.5, 0.9] }, registry);

			it("should store values", () => {
				const now = Date.now();
				item.observe(5, null, now);
				expect(item.values.get("")).toEqual({
					count: 1,
					labels: {},
					sum: 5,
					timestamp: now,
					quantileValues: expect.any(HistogramMetric.TimeWindowQuantiles)
				});
			});

			it("should sum values", () => {
				const now = Date.now();
				item.observe(13, null, now);
				expect(item.values.get("")).toEqual({
					count: 2,
					labels: {},
					sum: 18,
					timestamp: now,
					quantileValues: expect.any(HistogramMetric.TimeWindowQuantiles)
				});
			});

		});

	});

	describe("Test createBucketValues method", () => {

		const item = new HistogramMetric({ type: "histogram", name: "test.histogram", buckets: [1, 2, 5, 8, 10, 20] }, registry);

		it("should generate bucket object", () => {
			expect(item.createBucketValues()).toEqual({
				"1": 0,
				"2": 0,
				"5": 0,
				"8": 0,
				"10": 0,
				"20": 0,
			});
		});
	});

	describe("Test generateSnapshot & generateItemSnapshot methods", () => {

		const item = new HistogramMetric({
			type: "histogram",
			name: "test.histogram",
			labelNames: ["a"],
			buckets: [1, 2, 5, 8, 10, 20],
			quantiles: [0.1, 0.5, 0.9]
		}, registry);

		it("should generate snapshot", () => {
			const now = 1558295472783;
			item.observe(2, null, now +  1);
			item.observe(8, null, now +  5);
			item.observe(3, null, now + 10);
			item.observe(6, null, now + 15);
			item.observe(5, null, now + 20);

			item.observe(2, { a: 5 }, now + 25);
			item.observe(1, { a: 5 }, now + 30);
			item.observe(2, { a: 5 }, now + 35);
			item.observe(4, { a: 5 }, now + 40);

			expect(item.generateSnapshot()).toMatchSnapshot();
		});
	});

	describe("Test resetItem method", () => {

		const item = new HistogramMetric({
			type: "histogram",
			name: "test.histogram",
			labelNames: ["a"],
			buckets: [1, 2, 5, 10, 20],
			quantiles: [0.1, 0.5, 0.9]
		}, registry);

		it("should initialize a value item", () => {
			expect(item.resetItem({}, 123456)).toEqual({
				count: 0,
				sum: 0,
				timestamp: 123456,
				bucketValues: {
					"1": 0,
					"2": 0,
					"5": 0,
					"10": 0,
					"20": 0,
				},
				quantileValues: expect.any(HistogramMetric.TimeWindowQuantiles)
			});
		});
	});

	describe("Test reset & resetAll method", () => {

		const item = new HistogramMetric({
			type: "histogram",
			name: "test.histogram",
			labelNames: ["a"],
			buckets: [1, 2, 5, 10, 20],
			quantiles: [0.1, 0.5, 0.9]
		}, registry);

		jest.spyOn(item, "changed");

		it("should store initial values", () => {
			expect(item.values.size).toBe(0);

			const now = 1558295472783;
			item.observe(2, null, now +  1);
			item.observe(8, null, now +  5);
			item.observe(3, null, now + 10);
			item.observe(6, null, now + 15);
			item.observe(5, null, now + 20);

			item.observe(2, { a: 5 }, now + 25);
			item.observe(1, { a: 5 }, now + 30);
			item.observe(2, { a: 5 }, now + 35);
			item.observe(4, { a: 5 }, now + 40);

			expect(item.values.size).toBe(2);
		});

		it("should reset the labeled value", () => {
			item.changed.mockClear();
			item.reset({ a: 5 }, 23456);
			expect(item.values.get("5")).toEqual({
				labels: { a: 5 },
				count: 0,
				sum: 0,
				timestamp: 23456,
				bucketValues: {
					"1": 0,
					"2": 0,
					"5": 0,
					"10": 0,
					"20": 0,
				},
				quantileValues: expect.any(HistogramMetric.TimeWindowQuantiles)
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith({ a: 5 });
			expect(item.values.size).toBe(2);
		});

		it("should reset all values", () => {
			item.observe(2, { a: 5 }, 12345); // restore value
			item.changed.mockClear();

			item.resetAll(34567);
			expect(item.values.get("")).toEqual({
				labels: {},
				count: 0,
				sum: 0,
				timestamp: 34567,
				bucketValues: {
					"1": 0,
					"2": 0,
					"5": 0,
					"10": 0,
					"20": 0,
				},
				quantileValues: expect.any(HistogramMetric.TimeWindowQuantiles)
			});
			expect(item.values.get("5")).toEqual({
				labels: { a: 5 },
				count: 0,
				sum: 0,
				timestamp: 34567,
				bucketValues: {
					"1": 0,
					"2": 0,
					"5": 0,
					"10": 0,
					"20": 0,
				},
				quantileValues: expect.any(HistogramMetric.TimeWindowQuantiles)
			});
			expect(item.changed).toBeCalledTimes(1);
			expect(item.changed).toBeCalledWith();
			expect(item.values.size).toBe(2);
		});
	});

	describe("Test generateLinearBuckets & generateExponentialBuckets method", () => {

		it("should linear generate bucket", () => {
			expect(HistogramMetric.generateLinearBuckets(1, 1, 1)).toEqual([1]);
			expect(HistogramMetric.generateLinearBuckets(1, 1, 0)).toEqual([]);
			expect(HistogramMetric.generateLinearBuckets(0, 5, 3)).toEqual([0, 5, 10]);
			expect(HistogramMetric.generateLinearBuckets(1, 2, 10)).toEqual([1,3,5,7,9,11,13,15,17,19]);
		});

		it("should exponential generate bucket", () => {
			expect(HistogramMetric.generateExponentialBuckets(1, 1, 1)).toEqual([1]);
			expect(HistogramMetric.generateExponentialBuckets(1, 1, 0)).toEqual([]);
			expect(HistogramMetric.generateExponentialBuckets(1, 5, 3)).toEqual([1, 5, 25]);
			expect(HistogramMetric.generateExponentialBuckets(1, 2, 10)).toEqual([1,2,4,8,16,32,64,128,256,512]);
		});

	});

});

describe("Test Bucket class", () => {

	const bucket = new HistogramMetric.Bucket();

	it("should create variables", () => {
		expect(bucket.count).toBe(0);
		expect(bucket.samples).toEqual([]);
	});

	it("should store samples", () => {
		bucket.add(3);
		bucket.add(5);
		bucket.add(1);
		expect(bucket.count).toBe(3);
		expect(bucket.samples).toEqual([3, 5, 1]);
	});

	it("should clear samples", () => {
		bucket.clear();
		expect(bucket.count).toBe(0);
		expect(bucket.samples).toEqual([]);
	});

});
