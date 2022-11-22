"use strict";

const os = require("os");
const lolex = require("@sinonjs/fake-timers");
jest.mock("node-fetch");
const fetch = require("node-fetch");
fetch.mockImplementation(() => Promise.resolve({ statusText: "" }));

const DatadogReporter = require("../../../../src/metrics/reporters/datadog");
const ServiceBroker = require("../../../../src/service-broker");
const MetricRegistry = require("../../../../src/metrics/registry");

process.env.DATADOG_API_KEY = "datadog-api-key";

describe("Test Datadog Reporter class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const reporter = new DatadogReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,

				baseUrl: "https://api.datadoghq.com/api/",
				apiKey: "datadog-api-key",
				path: "/series",
				apiVersion: "v1",
				defaultLabels: expect.any(Function),
				host: os.hostname(),
				interval: 10
			});
		});

		it("should create with custom options", () => {
			const reporter = new DatadogReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},

				baseUrl: "https://api.custom-url.com/api/",
				apiKey: "12345",
				apiVersion: "v2",
				host: "custom-hostname",
				interval: 5
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),

				baseUrl: "https://api.custom-url.com/api/",
				apiKey: "12345",
				path: "/series",
				apiVersion: "v2",
				defaultLabels: expect.any(Function),
				host: "custom-hostname",
				interval: 5
			});
		});

		it("should throw error if apiKey is not defined", () => {
			expect(() => new DatadogReporter({ apiKey: "" })).toThrow(
				"Datadog API key is missing. Set DATADOG_API_KEY environment variable."
			);
		});
	});

	describe("Test init method", () => {
		let clock;
		let reporter;
		beforeAll(() => (clock = lolex.install()));
		afterAll(() => clock.uninstall());
		afterEach(async () => {
			await reporter.stop();
		});

		it("should start timer", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			reporter = new DatadogReporter({ interval: 5 });
			reporter.flush = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeDefined();
			expect(reporter.flush).toBeCalledTimes(0);

			clock.tick(5500);

			expect(reporter.flush).toBeCalledTimes(1);
		});

		it("should generate defaultLabels", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			reporter = new DatadogReporter({});
			reporter.init(fakeRegistry);

			expect(reporter.defaultLabels).toStrictEqual({
				namespace: "test-ns",
				nodeID: "node-123"
			});
		});

		it("should set static defaultLabels", () => {
			const fakeBroker = {};
			const fakeRegistry = { broker: fakeBroker };
			reporter = new DatadogReporter({
				defaultLabels: {
					a: 5,
					b: "John"
				}
			});
			reporter.init(fakeRegistry);

			expect(reporter.defaultLabels).toStrictEqual({
				a: 5,
				b: "John"
			});
		});
	});

	describe("Test flush method", () => {
		let reporter;
		afterEach(async () => {
			await reporter.stop();
		});

		it("should call generateDatadogSeries method but not fetch", async () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			reporter = new DatadogReporter({});
			reporter.init(fakeRegistry);

			reporter.generateDatadogSeries = jest.fn(() => []);

			await reporter.flush();

			expect(reporter.generateDatadogSeries).toBeCalledTimes(1);
			expect(fetch).toBeCalledTimes(0);
		});

		it("should call generateDatadogSeries method & fetch", async () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker, logger: { debug: jest.fn() } };
			reporter = new DatadogReporter({ apiKey: "12345" });
			reporter.init(fakeRegistry);

			reporter.generateDatadogSeries = jest.fn(() => [{ a: 5 }, { a: 6 }]);

			await reporter.flush();

			expect(reporter.generateDatadogSeries).toBeCalledTimes(1);
			expect(fetch).toBeCalledTimes(1);
			expect(fetch).toBeCalledWith("https://api.datadoghq.com/api/v1/series", {
				body: '{"series":[{"a":5},{"a":6}]}',
				headers: {
					"Content-Type": "application/json",
					"DD-API-KEY": "12345"
				},
				method: "post"
			});
		});
	});

	describe("Test generateDatadogSeries method", () => {
		let clock;
		let reporter;

		beforeAll(() => (clock = lolex.install({ now: 12345678000 })));
		afterAll(() => clock.uninstall());
		afterEach(async () => {
			await reporter.stop();
		});

		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);

		afterAll(async () => {
			await broker.stop();
		});

		it("should call generateDatadogSeries method but not fetch", () => {
			reporter = new DatadogReporter({
				host: "test-host",
				defaultLabels: {
					defLabel: 'def\\Value-"quote"'
				}
			});
			reporter.init(registry);

			registry.register({ name: "os.datetime.utc", type: 3 }).set(123456);
			registry.register({ name: "test.info", type: 0 }).set("Test Value");

			registry.register({ name: "test.counter", type: 1, labelNames: ["action"] });
			registry.increment("test.counter", null, 5);
			registry.increment("test.counter", { action: "posts" }, 8);

			registry.register({ name: "test.gauge", type: 3, labelNames: ["action"] });
			registry.decrement("test.gauge", { action: "users" }, 8);

			registry.register({
				name: "test.histogram",
				type: "histogram",
				labelNames: ["action"],
				buckets: true,
				quantiles: true
			});
			registry.observe("test.histogram", 8, null);
			registry.observe("test.histogram", 2, null);
			registry.observe("test.histogram", 6, null);
			registry.observe("test.histogram", 2, null);

			registry.observe("test.histogram", 1, { action: "auth" });
			registry.observe("test.histogram", 3, { action: "auth" });
			registry.observe("test.histogram", 7, { action: "auth" });

			const res = reporter.generateDatadogSeries();

			expect(res).toMatchSnapshot();
		});
	});
});
