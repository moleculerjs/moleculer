const { BrokerOptionsError } = require("../../../src/errors");
const MetricTypes = require("../../../src/metrics/types");

describe("Test MetricTypes resolver", () => {

	it("should resolve null from undefined", () => {
		expect(() => MetricTypes.resolve()).toThrowError(BrokerOptionsError);
		expect(() => MetricTypes.resolve({})).toThrowError(BrokerOptionsError);
		expect(() => MetricTypes.resolve("xyz")).toThrowError(BrokerOptionsError);
	});

	it("should resolve metric types by string", () => {
		expect(MetricTypes.resolve("counter")).toBeInstanceOf(MetricTypes.Counter);
		expect(MetricTypes.resolve("gauge")).toBeInstanceOf(MetricTypes.Gauge);
		expect(MetricTypes.resolve("histogram")).toBeInstanceOf(MetricTypes.Histogram);
		expect(MetricTypes.resolve("info")).toBeInstanceOf(MetricTypes.Info);
	});

});
