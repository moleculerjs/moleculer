"use strict";

const lolex = require("lolex");

jest.mock("dgram");
const dgram = require("dgram");
const sockSend = jest.fn((data, from, to, port, host, cb) => cb());
const sockClose = jest.fn();
dgram.createSocket = jest.fn(() => ({
	send: sockSend,
	close: sockClose
}));

const StatsDReporter = require("../../../../src/metrics/reporters/statsd");
const ServiceBroker = require("../../../../src/service-broker");
const MetricRegistry = require("../../../../src/metrics/registry");

describe("Test StatsDReporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const reporter = new StatsDReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,

				protocol: "udp",
				host: "localhost",
				port: 8125,

				maxPayloadSize: 1300,
			});
		});

		it("should create with custom options", () => {
			const reporter = new StatsDReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},

				protocol: "udp",
				host: "localhost",
				port: 8888,

				maxPayloadSize: 600,
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),

				protocol: "udp",
				host: "localhost",
				port: 8888,

				maxPayloadSize: 600,
			});
		});

	});

	describe("Test init method", () => {
		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		it("should start timer & create directory", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new StatsDReporter({ interval: 2000, folder: "/metrics" });
			reporter.flush = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.flush).toBeCalledTimes(1);
		});

	});

	describe("Test labelsToTags method", () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);
		const reporter = new StatsDReporter({});
		reporter.init(registry);

		it("should convert labels to filename compatible string", () => {
			expect(reporter.labelsToTags()).toBe("");
			expect(reporter.labelsToTags({})).toBe("");
			expect(reporter.labelsToTags({
				a: 5,
				b: "John",
				c: true,
				d: null,
				e: "\"Hello ' Mol:ec?uler\""
			})).toBe("a:5,b:John,c:true,d:null,e:\\\"Hello ' Mol:ec?uler\\\"");
		});

	});

	describe("Test flush method", () => {
		const fakeBroker = {
			nodeID: "node-123",
			namespace: "test-ns"
		};
		const fakeRegistry = { broker: fakeBroker };
		const reporter = new StatsDReporter({});
		reporter.sendChunks = jest.fn();
		reporter.generateStatsDSeries = jest.fn(() => []);
		reporter.init(fakeRegistry);

		it("should call generateStatsDSeries", () => {
			reporter.generateStatsDSeries.mockClear();
			reporter.sendChunks.mockClear();

			reporter.flush();

			expect(reporter.generateStatsDSeries).toBeCalledTimes(1);
			expect(reporter.sendChunks).toBeCalledTimes(0);
		});

		it("should call generateStatsDSeries & sendChunks", () => {
			reporter.generateStatsDSeries = jest.fn(() => [1, 2]);
			reporter.sendChunks.mockClear();

			reporter.flush();

			expect(reporter.generateStatsDSeries).toBeCalledTimes(1);
			expect(reporter.sendChunks).toBeCalledTimes(1);
			expect(reporter.sendChunks).toBeCalledWith([1,2]);
		});

	});

	describe("Test sendChunks method with maxPayloadSize", () => {
		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		const fakeBroker = {
			nodeID: "node-123",
			namespace: "test-ns"
		};
		const fakeRegistry = { broker: fakeBroker };
		const reporter = new StatsDReporter({ maxPayloadSize: 200 });
		reporter.send = jest.fn();

		const series = [
			"12345678901234567890123456789012345678901234567890",
			"23456789012345678901234567890123456789012345678901",
			"34567890123456789012345678901234567890123456789012",
			"45678901234567890123456789012345678901234567890123",
			"56789012345678901234567890123456789012345678901234",
			"67890123456789012345678901234567890123456789012345",
		];

		it("should call send with chunks", () => {
			reporter.send.mockClear();

			reporter.sendChunks(Array.from(series));

			expect(reporter.send).toBeCalledTimes(1);
			expect(reporter.send).toBeCalledWith(Buffer.from(series.slice(0, 4).join("\n")));
		});

		it("should call send with the rest", () => {
			reporter.send.mockClear();

			clock.tick(150);

			expect(reporter.send).toBeCalledTimes(1);
			expect(reporter.send).toBeCalledWith(Buffer.from(series.slice(4, 6).join("\n")));
		});

		it("should not call send", () => {
			reporter.send.mockClear();

			clock.tick(150);

			expect(reporter.send).toBeCalledTimes(0);
		});

	});

	describe("Test sendChunks method without maxPayloadSize", () => {
		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		const fakeBroker = {
			nodeID: "node-123",
			namespace: "test-ns"
		};
		const fakeRegistry = { broker: fakeBroker };
		const reporter = new StatsDReporter({ maxPayloadSize: 0 });
		reporter.send = jest.fn();

		const series = [
			"12345678901234567890123456789012345678901234567890",
			"23456789012345678901234567890123456789012345678901",
			"34567890123456789012345678901234567890123456789012",
			"45678901234567890123456789012345678901234567890123",
			"56789012345678901234567890123456789012345678901234",
			"67890123456789012345678901234567890123456789012345",
		];

		it("should call send with all chunks", () => {
			reporter.send.mockClear();

			reporter.sendChunks(Array.from(series));

			expect(reporter.send).toBeCalledTimes(1);
			expect(reporter.send).toBeCalledWith(Buffer.from(series.slice(0, 6).join("\n")));
		});

		it("should not call send", () => {
			reporter.send.mockClear();

			clock.tick(150);

			expect(reporter.send).toBeCalledTimes(0);
		});

	});

	describe("Test send method", () => {
		const broker = new ServiceBroker({ logger: false, metrics: true });
		const registry = broker.metrics;
		const reporter = new StatsDReporter({ maxPayloadSize: 0 });
		reporter.init(registry);

		it("should send data via udp4", () => {
			dgram.createSocket.mockClear();
			sockSend.mockClear();
			sockClose.mockClear();

			const buf = Buffer.from("Moleculer Metrics Data");
			reporter.send(buf);

			expect(dgram.createSocket).toBeCalledTimes(1);
			expect(dgram.createSocket).toBeCalledWith("udp4");

			expect(sockSend).toBeCalledTimes(1);
			expect(sockSend).toBeCalledWith(buf, 0, 22, 8125, "localhost", expect.any(Function));

			expect(sockClose).toBeCalledTimes(1);
		});

	});

	describe("Test generateStatsDSeries & generateStatDLine method", () => {
		const broker = new ServiceBroker({ logger: false, metrics: true });
		const registry = broker.metrics;
		const reporter = new StatsDReporter({
			includes: "test.**"
		});

		reporter.init(registry);

		it("should call generateStatDLine", () => {
			registry.register({ name: "os.datetime.utc", type: "gauge" }).set(123456);
			registry.register({ name: "test.info", type: "info", description: "Test Info Metric" }).set("Test Value");

			registry.register({ name: "test.counter", type: "counter", labelNames: ["action"], description: "Test Counter Metric" });
			registry.increment("test.counter", null, 5);
			registry.increment("test.counter", { action: "posts\\comments" }, 8);

			registry.register({ name: "test.gauge-total", type: "gauge", labelNames: ["action"], description: "Test Gauge Metric" });
			registry.decrement("test.gauge-total", { action: "users-\"John\"" }, 8);
			registry.set("test.gauge-total", { action: "posts" }, null);

			registry.register({ name: "test.histogram", type: "histogram", labelNames: ["action"], buckets: true, quantiles: true, unit: "byte" });
			registry.observe("test.histogram", 8, null);
			registry.observe("test.histogram", 2, null);
			registry.observe("test.histogram", 6, null);
			registry.observe("test.histogram", 2, null);

			registry.observe("test.histogram", 1, { action: "auth" });
			registry.observe("test.histogram", 3, { action: "auth" });
			registry.observe("test.histogram", 7, { action: "auth" });

			const res = reporter.generateStatsDSeries();

			expect(res).toEqual([
				"test.info:\"Test Value\"|s",
				"test.counter:5|c|#",
				"test.counter:8|c|#action:posts\\\\comments",
				"test.gauge-total:-8|g|#action:users-\\\"John\\\"",
				"test.gauge-total:[object Object]|g|#"
			]);
		});

	});

	describe("Test metricChanged method", () => {
		const broker = new ServiceBroker({ logger: false, metrics: {
			reporter: "StatsD"
		} });
		const registry = broker.metrics;
		const reporter = registry.reporter[0];

		it("should call generateStatDLine", () => {
			registry.register({ name: "test.histogram", type: "histogram", labelNames: ["action"], buckets: true, quantiles: true, unit: "byte" });

			reporter.send = jest.fn();

			registry.observe("test.histogram", 7, { action: "auth" });

			expect(reporter.send).toBeCalledTimes(1);
			expect(reporter.send).toBeCalledWith(Buffer.from("test.histogram:7|ms|#action:auth"));
		});

	});

});
