const { BrokerOptionsError } = require("../../../../src/errors");
const MetricTypes = require("../../../../src/metrics/types");

describe("Test MetricTypes resolver", () => {
	it("should throw error", () => {
		expect(() => MetricTypes.resolve()).toThrowError(BrokerOptionsError);
		expect(() => MetricTypes.resolve("xyz")).toThrowError(BrokerOptionsError);
	});

	it("should resolve metric types by string", () => {
		expect(MetricTypes.resolve("counter")).toBe(MetricTypes.Counter);
		expect(MetricTypes.resolve("gauge")).toBe(MetricTypes.Gauge);
		expect(MetricTypes.resolve("histogram")).toBe(MetricTypes.Histogram);
		expect(MetricTypes.resolve("info")).toBe(MetricTypes.Info);
	});
});

describe("Test MetricTypes register", () => {
	class MyCustom {}

	it("should throw error if type if not correct", () => {
		expect(() => {
			MetricTypes.resolve("MyCustom");
		}).toThrowError(BrokerOptionsError);
	});

	it("should register new type", () => {
		MetricTypes.register("MyCustom", MyCustom);
		expect(MetricTypes.MyCustom).toBe(MyCustom);
	});

	it("should find the new type", () => {
		const type = MetricTypes.resolve("MyCustom");
		expect(type).toBe(MyCustom);
	});
});
