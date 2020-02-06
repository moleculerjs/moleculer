"use strict";

const lolex = require("@sinonjs/fake-timers");

const utils = require("../../../../src/utils");
utils.makeDirs = jest.fn();

jest.mock("fs");
const fs = require("fs");

jest.mock("path", () => ({
	dirname: jest.fn(() => "some-dir"),
	join: jest.fn((...args) => args.join("/")),
	resolve: jest.fn((...args) => args.join("/"))
}));

const CSVReporter = require("../../../../src/metrics/reporters/csv");
const ServiceBroker = require("../../../../src/service-broker");
const MetricRegistry = require("../../../../src/metrics/registry");

describe("Test CSVReporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const reporter = new CSVReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,

				folder: "./reports/metrics",
				delimiter: ",",
				rowDelimiter: "\n",
				mode: "metric",
				types: null,
				interval: 5,
				filenameFormatter: null,
				rowFormatter: null,
			});

			expect(reporter.lastChanges).toBeInstanceOf(Set);
		});

		it("should create with custom options", () => {
			const reporter = new CSVReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},

				folder: "./metrics",
				delimiter: ";",
				rowDelimiter: "\r\n",
				mode: "label",
				types: ["gauge", "counter"],
				interval: 10,
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),

				folder: "./metrics",
				delimiter: ";",
				rowDelimiter: "\r\n",
				mode: "label",
				types: ["gauge", "counter"],
				interval: 10,

				filenameFormatter: null,
				rowFormatter: null,
			});
		});

	});

	describe("Test init method", () => {
		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		it("should start timer & create directory", () => {
			utils.makeDirs.mockClear();

			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new CSVReporter({ interval: 2, folder: "/metrics" });
			reporter.flush = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeDefined();
			expect(reporter.flush).toBeCalledTimes(0);

			expect(utils.makeDirs).toHaveBeenCalledTimes(1);
			expect(utils.makeDirs).toHaveBeenCalledWith("/metrics");

			clock.tick(2500);

			expect(reporter.flush).toBeCalledTimes(1);
		});

		it("should not start timer but create directory", () => {
			utils.makeDirs.mockClear();

			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new CSVReporter({ interval: 0, folder: "/metrics" });
			reporter.flush = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeUndefined();
			expect(reporter.flush).toBeCalledTimes(0);

			expect(utils.makeDirs).toHaveBeenCalledTimes(1);
			expect(utils.makeDirs).toHaveBeenCalledWith("/metrics");

			clock.tick(2500);

			expect(reporter.flush).toBeCalledTimes(0);
		});

	});

	describe("Test labelsToStr method", () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);
		const reporter = new CSVReporter({});
		reporter.init(registry);

		it("should convert labels to filename compatible string", () => {
			expect(reporter.labelsToStr()).toBe("");
			expect(reporter.labelsToStr({})).toBe("");
			expect(reporter.labelsToStr({
				a: 5,
				b: "John",
				c: true,
				d: null,
				e: "%Hello . Mol:ec?uler/"
			})).toBe("a=5--b=John--c=true--d=null--e=Hello_._Moleculer");
		});

	});

	describe("Test getFilename method", () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);
		const reporter = new CSVReporter({ folder: "/metrics" });
		reporter.init(registry);

		const metric = { name: "moleculer.request.total" };
		const item = {
			labels: {
				a: 5,
				b: "John Doe"
			}
		};

		it("should create metric-based filename", () => {
			expect(reporter.getFilename(metric, item)).toBe("/metrics/moleculer.request.total.csv");
		});

		it("should create label-based filename", () => {
			reporter.opts.mode = "label";
			expect(reporter.getFilename(metric, item)).toBe("/metrics/moleculer.request.total/moleculer.request.total--a=5--b=John_Doe.csv");
		});

		it("should create metric-based filename", () => {
			reporter.opts.filenameFormatter = jest.fn(() => "/xyz.csv");
			expect(reporter.getFilename(metric, item)).toBe("/xyz.csv");

			expect(reporter.opts.filenameFormatter).toHaveBeenCalledTimes(1);
			expect(reporter.opts.filenameFormatter).toHaveBeenCalledWith("moleculer.request.total", metric, item);
		});

	});

	describe("Test writeRow method", () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);
		const reporter = new CSVReporter({ folder: "/metrics" });
		reporter.init(registry);

		const headers = ["header1", "header2"];
		const data = ["data1", "data2"];

		it("should create a new file with header & data", () => {
			fs.existsSync = jest.fn(() => false);

			reporter.writeRow("test.csv", headers, data);

			expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
			expect(fs.writeFileSync).toHaveBeenCalledWith("test.csv", "header1,header2\n");

			expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
			expect(fs.appendFileSync).toHaveBeenCalledWith("test.csv", "data1,data2\n");
		});

		it("should append data", () => {
			reporter.opts.delimiter = ";";
			reporter.opts.rowDelimiter = "\r\n";
			fs.writeFileSync.mockClear();
			fs.appendFileSync.mockClear();
			fs.existsSync = jest.fn(() => true);

			reporter.writeRow("test.csv", headers, data);

			expect(fs.writeFileSync).toHaveBeenCalledTimes(0);

			expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
			expect(fs.appendFileSync).toHaveBeenCalledWith("test.csv", "data1;data2\r\n");
		});

	});


	describe("Test flush method", () => {
		let clock, broker, registry, reporter;
		let ROWS = [];

		beforeAll(() => {
			clock = lolex.install({ now: 12345678000 });

			broker = new ServiceBroker({
				logger: false,
				nodeID: "node-123",
				metrics: {
					reporter: {
						type: "CSV",
						options: {
							excludes: ["moleculer.node.versions.moleculer"]
						}
					}
				}
			});

			registry = broker.metrics;
			reporter = registry.reporter[0];
			reporter.writeRow = jest.fn((...args) => ROWS.push(args));
		});
		afterAll(() => clock.uninstall());

		it("should call broker emit with changes", () => {

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

			reporter.flush();

			expect(ROWS).toMatchSnapshot();
		});

		it("should write changes only", () => {
			ROWS = [];
			reporter.opts.rowFormatter = jest.fn((data, headers/*, metric, item*/) => {
				data.push("MyData");
				headers.push("MyField");
			});

			expect(reporter.lastChanges.size).toBe(0);

			registry.increment("test.counter", null, 7);
			registry.decrement("test.gauge-total", { action: "posts" }, 5);

			expect(reporter.lastChanges.size).toBe(2);

			reporter.flush();

			expect(ROWS).toMatchSnapshot();
			expect(reporter.lastChanges.size).toBe(0);

		});

	});

});
