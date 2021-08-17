const utils = require("../../../../src/utils");
utils.makeDirs = jest.fn();

const { BrokerOptionsError } = require("../../../../src/errors");
const MetricReporters = require("../../../../src/metrics/reporters");

process.env.DATADOG_API_KEY = "datadog-api-key";

describe("Test MetricReporters resolver", () => {
	it("should throw error", () => {
		expect(() => MetricReporters.resolve()).toThrowError(BrokerOptionsError);
		expect(() => MetricReporters.resolve({})).toThrowError(BrokerOptionsError);
		expect(() => MetricReporters.resolve("xyz")).toThrowError(BrokerOptionsError);
		expect(() => MetricReporters.resolve({ type: "xyz" })).toThrowError(BrokerOptionsError);
	});

	it("should resolve console metric reporter from string", () => {
		let reporter = MetricReporters.resolve("Console");
		expect(reporter).toBeInstanceOf(MetricReporters.Console);
	});

	it("should resolve console metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "Console", options });
		expect(reporter).toBeInstanceOf(MetricReporters.Console);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});

	it("should resolve CSV metric reporter from string", () => {
		let reporter = MetricReporters.resolve("CSV");
		expect(reporter).toBeInstanceOf(MetricReporters.CSV);
	});

	it("should resolve CSV metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "CSV", options });
		expect(reporter).toBeInstanceOf(MetricReporters.CSV);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});

	it("should resolve event metric reporter from string", () => {
		let reporter = MetricReporters.resolve("Event");
		expect(reporter).toBeInstanceOf(MetricReporters.Event);
	});

	it("should resolve event metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "Event", options });
		expect(reporter).toBeInstanceOf(MetricReporters.Event);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});

	it("should resolve Prometheus metric reporter from string", () => {
		let reporter = MetricReporters.resolve("Prometheus");
		expect(reporter).toBeInstanceOf(MetricReporters.Prometheus);
	});

	it("should resolve Prometheus metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "Prometheus", options });
		expect(reporter).toBeInstanceOf(MetricReporters.Prometheus);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});

	it("should resolve Datadog metric reporter from string", () => {
		let reporter = MetricReporters.resolve("Datadog");
		expect(reporter).toBeInstanceOf(MetricReporters.Datadog);
	});

	it("should resolve Datadog metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "Datadog", options });
		expect(reporter).toBeInstanceOf(MetricReporters.Datadog);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});

	it("should resolve StatsD metric reporter from string", () => {
		let reporter = MetricReporters.resolve("StatsD");
		expect(reporter).toBeInstanceOf(MetricReporters.StatsD);
	});

	it("should resolve StatsD metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "StatsD", options });
		expect(reporter).toBeInstanceOf(MetricReporters.StatsD);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});
});

describe("Test Reporter register", () => {
	class MyCustom {}

	it("should throw error if type if not correct", () => {
		expect(() => {
			MetricReporters.resolve("MyCustom");
		}).toThrowError(BrokerOptionsError);
	});

	it("should register new type", () => {
		MetricReporters.register("MyCustom", MyCustom);
		expect(MetricReporters.MyCustom).toBe(MyCustom);
	});

	it("should find the new type", () => {
		const reporter = MetricReporters.resolve("MyCustom");
		expect(reporter).toBeInstanceOf(MyCustom);
	});
});
