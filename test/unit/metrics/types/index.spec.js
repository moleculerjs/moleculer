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
