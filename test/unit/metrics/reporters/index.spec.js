const { BrokerOptionsError } = require("../../../../src/errors");
const MetricReporters = require("../../../../src/metrics/reporters");

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

	it("should resolve UDP metric reporter from string", () => {
		let reporter = MetricReporters.resolve("UDP");
		expect(reporter).toBeInstanceOf(MetricReporters.UDP);
	});

	it("should resolve UDP metric reporter from obj", () => {
		let options = { interval: 2000 };
		let reporter = MetricReporters.resolve({ type: "UDP", options });
		expect(reporter).toBeInstanceOf(MetricReporters.UDP);
		expect(reporter.opts).toEqual(expect.objectContaining({ interval: 2000 }));
	});

});
