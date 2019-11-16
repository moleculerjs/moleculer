"use strict";

const lolex = require("lolex");
const request = require("supertest");

const PrometheusReporter = require("../../../../src/metrics/reporters/prometheus");
const ServiceBroker = require("../../../../src/service-broker");
const MetricRegistry = require("../../../../src/metrics/registry");

// TODO: call server.close in afters

describe("Test Prometheus Reporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const reporter = new PrometheusReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,

				port: 3030,
				path: "/metrics",
				defaultLabels: expect.any(Function),
			});
		});

		it("should create with custom options", () => {
			const reporter = new PrometheusReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},

				port: 12345,
				path: "/meter"
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),

				port: 12345,
				path: "/meter",
				defaultLabels: expect.any(Function),
			});
		});

	});

	describe("Test init method", () => {

		it("should create HTTP server", () => {
			const broker = new ServiceBroker({ logger: false, nodeID: "test-node", namespace: "test-ns" });
			const registry = new MetricRegistry(broker);
			const reporter = new PrometheusReporter({ port: 0 });
			reporter.init(registry);

			expect(reporter.server).toBeDefined();
		});

		it("should generate defaultLabels", () => {
			const broker = new ServiceBroker({ logger: false, nodeID: "test-node", namespace: "test-ns" });
			const registry = new MetricRegistry(broker);
			const reporter = new PrometheusReporter({ port: 0 });
			reporter.init(registry);

			expect(reporter.defaultLabels).toStrictEqual({
				namespace: "test-ns",
				nodeID: "test-node"
			});
		});

		it("should set static defaultLabels", () => {
			const broker = new ServiceBroker({ logger: false, nodeID: "test-node", namespace: "test-ns" });
			const registry = new MetricRegistry(broker);
			const reporter = new PrometheusReporter({
				port: 0,
				defaultLabels: {
					a: 5,
					b: "John"
				}
			});
			reporter.init(registry);

			expect(reporter.defaultLabels).toStrictEqual({
				a: 5,
				b: "John"
			});
		});

	});

	describe("Test stop method", () => {
		it("should stop HTTP server", () => {
			const broker = new ServiceBroker({ logger: false, nodeID: "test-node", namespace: "test-ns" });
			const registry = new MetricRegistry(broker);
			const reporter = new PrometheusReporter({ port: 0 });
			reporter.init(registry);

			reporter.stop().then(() => {
				expect(reporter.server.listening).toBe(false);
			});
		});
	});

	describe("Test HTTP handler method", () => {

		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);
		const reporter = new PrometheusReporter({ port: 0 });
		reporter.init(registry);

		reporter.generatePrometheusResponse = jest.fn(() => "Fake generatePrometheusResponse content.");

		it("should return 404 if path is not match", async () => {
			const res = await request(reporter.server).get("/");
			expect(res.statusCode).toBe(404);
			expect(res.text).toBe("");

			expect(reporter.generatePrometheusResponse).toBeCalledTimes(0);
		});

		it("should call generatePrometheusResponse method and send response", async () => {
			const res = await request(reporter.server).get("/metrics").set("Accept-Encoding", "none");
			expect(res.statusCode).toBe(200);
			expect(res.headers["content-type"]).toBe("text/plain; version=0.0.4; charset=utf-8");
			expect(res.text).toBe("Fake generatePrometheusResponse content.");

			expect(reporter.generatePrometheusResponse).toBeCalledTimes(1);
		});

		it("should call generatePrometheusResponse method and send response", async () => {
			reporter.generatePrometheusResponse.mockClear();

			const res = await request(reporter.server).get("/metrics").set("Accept-Encoding", "gzip");
			expect(res.statusCode).toBe(200);
			expect(res.headers["content-type"]).toBe("text/plain; version=0.0.4; charset=utf-8");
			expect(res.headers["content-encoding"]).toBe("gzip");
			expect(res.text).toBe("Fake generatePrometheusResponse content.");

			expect(reporter.generatePrometheusResponse).toBeCalledTimes(1);
		});
	});

	describe("Test generatePrometheusResponse method", () => {
		let clock;
		beforeAll(() => clock = lolex.install({ now: 12345678000 }));
		afterAll(() => clock.uninstall());

		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);

		it("should call generatePrometheusResponse method but not fetch", () => {

			const reporter = new PrometheusReporter({
				port: 0,
				host: "test-host",
				defaultLabels: {
					a: 5
				}
			});
			reporter.init(registry);

			registry.register({ name: "os.datetime.utc", type: "gauge" }).set(123456);
			registry.register({ name: "test.info", type: "info", description: "Test Info Metric" }).set("Test Value");

			registry.register({ name: "test.counter", type: "counter", labelNames: ["action"], description: "Test Counter Metric" });
			registry.increment("test.counter", null, 5);
			registry.increment("test.counter", { action: "posts\\comments" }, 8);

			registry.register({ name: "test.gauge-total", type: "gauge", labelNames: ["action"], description: "Test Gauge Metric", rate: true });
			registry.increment("test.gauge-total", { action: "users-\"John\"" }, 10);
			clock.tick(100);
			registry.decrement("test.gauge-total", { action: "users-\"John\"" }, 8);
			registry.set("test.gauge-total", null, { action: "posts" });

			registry.register({ name: "test.histogram", type: "histogram", labelNames: ["action"], buckets: true, quantiles: true, unit: "bytes", rate: true });
			registry.observe("test.histogram", 8, null);
			registry.observe("test.histogram", 2, null);
			clock.tick(500);
			registry.observe("test.histogram", 6, null);
			registry.observe("test.histogram", 2, null);


			registry.observe("test.histogram", 1, { action: "auth" });
			registry.observe("test.histogram", 3, { action: "auth" });
			clock.tick(500);
			registry.observe("test.histogram", 7, { action: "auth" });

			clock.tick(10 * 1000);

			const res = reporter.generatePrometheusResponse();

			expect(res).toMatchSnapshot();
		});

	});

});
