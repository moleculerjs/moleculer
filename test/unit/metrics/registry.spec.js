"use strict";

const utils	= require("../../../src/utils");
utils.makeDirs = jest.fn();

const MetricCommons = require("../../../src/metrics/commons");
jest.spyOn(MetricCommons, "registerCommonMetrics");
jest.spyOn(MetricCommons, "updateCommonMetrics");

const ServiceBroker = require("../../../src/service-broker");
const MetricRegistry = require("../../../src/metrics/registry");
const MetricTypes = require("../../../src/metrics/types");
const MetricReporters = require("../../../src/metrics/reporters");
const METRIC = require("../../../src/metrics/constants");

const lolex = require("lolex");

describe("Test Metric Registry", () => {

	describe("Test Constructor", () => {

		const broker = new ServiceBroker({ logger: false });

		it("should create with default options", () => {

			const metric = new MetricRegistry(broker);

			expect(metric.broker).toBe(broker);
			expect(metric.logger).toBeDefined();
			expect(metric.dirty).toBe(true);

			expect(metric.opts).toMatchSnapshot();

			expect(metric.store).toBeInstanceOf(Map);

			expect(metric.isEnabled()).toBe(true);
		});

		it("should create with custom options", () => {

			const metric = new MetricRegistry(broker, {
				enabled: false,
				collectProcessMetrics: false,

				reporter: "Prometheus",

				defaultBuckets: [1,2,3,4,5],
				defaultQuantiles: [0.1, 0.5, 0.9]
			});

			expect(metric.broker).toBe(broker);
			expect(metric.logger).toBeDefined();
			expect(metric.dirty).toBe(true);

			expect(metric.opts).toMatchSnapshot();

			expect(metric.store).toBeInstanceOf(Map);

			expect(metric.isEnabled()).toBe(false);
		});
	});

	describe("Test init method", () => {

		let clock;
		beforeAll(() => {
			clock = lolex.install();
		});

		afterAll(() => {
			clock.uninstall();
		});


		const broker = new ServiceBroker({ logger: false });

		it("should not create timers & reporter", () => {
			const metric = new MetricRegistry(broker, { collectProcessMetrics: false });
			MetricCommons.registerCommonMetrics.mockClear();
			MetricCommons.updateCommonMetrics.mockClear();

			metric.init();

			expect(metric.reporter).toBeUndefined();
			expect(metric.collectTimer).toBeUndefined();
			expect(MetricCommons.registerCommonMetrics).toHaveBeenCalledTimes(0);
			expect(MetricCommons.updateCommonMetrics).toHaveBeenCalledTimes(0);
		});

		it("should create timers & reporters", () => {
			const metric = new MetricRegistry(broker, {
				collectProcessMetrics: true,
				reporter: "Event"
			});
			MetricCommons.registerCommonMetrics.mockClear();
			MetricCommons.updateCommonMetrics.mockClear();

			metric.init();

			expect(metric.reporter).toBeInstanceOf(Array);
			expect(metric.reporter[0]).toBeInstanceOf(MetricReporters.Event);
			expect(metric.collectTimer).toBeDefined();
			expect(MetricCommons.registerCommonMetrics).toHaveBeenCalledTimes(1);
			expect(MetricCommons.updateCommonMetrics).toHaveBeenCalledTimes(1);

			clock.tick(metric.opts.collectInterval * 1000 + 100);

			expect(MetricCommons.registerCommonMetrics).toHaveBeenCalledTimes(1);
			expect(MetricCommons.updateCommonMetrics).toHaveBeenCalledTimes(2);
		});

	});

	describe("Test stop method", () => {
		it("should stop reporters", () => {
			const broker = new ServiceBroker({ logger: false });
			const metric = new MetricRegistry(broker, {
				collectProcessMetrics: true,
				reporter: "Event"
			});

			metric.init();
			metric.reporter[0].stop = jest.fn(() => Promise.resolve());

			expect(metric.stop()).toBeInstanceOf(broker.Promise);
			expect(metric.reporter[0].stop).toHaveBeenCalledTimes(1);
		});

	});

	describe("Test register method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		it("should throw errors if parameter is not valid", () => {
			expect(() => metric.register()).toThrow("Wrong argument. Must be an Object.");
			expect(() => metric.register(1)).toThrow("Wrong argument. Must be an Object.");
			expect(() => metric.register("John")).toThrow("Wrong argument. Must be an Object.");

			expect(() => metric.register({})).toThrow("The metric 'type' property is mandatory.");
			expect(() => metric.register({ type: "counter" })).toThrow("The metric 'name' property is mandatory.");
			expect(() => metric.register({ type: "counter", name: "test!" })).toThrow("The metric 'name' is not valid: test!");
			expect(() => metric.register({ type: "counter", name: "test", labelNames: ["label!"] })).toThrow("The 'test' metric label name is not valid: label!");

			expect(() => metric.register({ type: "unknow", name: "test" })).toThrow("Invalid metric type 'unknow'.");

			expect(metric.store.size).toBe(0);
		});

		it("should return metric item", () => {
			const item = metric.register({ type: "counter", name: "test" });
			expect(item).toBeInstanceOf(MetricTypes.Counter);
			expect(metric.store.size).toBe(1);
		});

		it("should return null if metrics disabled", () => {
			const metric = new MetricRegistry(broker, { enabled: false, collectProcessMetrics: false });
			const item = metric.register({ type: "counter", name: "test" });
			expect(item).toBeNull();
			expect(metric.store.size).toBe(0);
		});
	});

	describe("Test hasMetric method", () => {

		const broker = new ServiceBroker({ logger: false });

		it("should find the stored metrics if metrics enabled", () => {
			const metric = new MetricRegistry(broker, { collectProcessMetrics: false });
			metric.register({ name: "test.first", type: "counter" });
			metric.register({ name: "test.second", type: "gauge" });

			expect(metric.hasMetric("test.first")).toBe(true);
			expect(metric.hasMetric("test.second")).toBe(true);
			expect(metric.hasMetric("test.third")).toBe(false);
		});

		it("should not find if metrics disabled", () => {
			const metric = new MetricRegistry(broker, { enabled: false, collectProcessMetrics: false });
			metric.register({ name: "test.first", type: "counter" });
			metric.register({ name: "test.second", type: "gauge" });

			expect(metric.hasMetric("test.first")).toBe(false);
			expect(metric.hasMetric("test.second")).toBe(false);
			expect(metric.hasMetric("test.third")).toBe(false);
		});

	});

	describe("Test getMetric method", () => {

		const broker = new ServiceBroker({ logger: false });

		it("should return the stored metrics if metrics enabled", () => {
			const metric = new MetricRegistry(broker, { collectProcessMetrics: false });
			metric.register({ name: "test.first", type: "counter" });
			metric.register({ name: "test.second", type: "gauge" });

			expect(metric.getMetric("test.first")).toBeDefined();
			expect(metric.getMetric("test.second")).toBeDefined();
			expect(metric.getMetric("test.third")).toBeNull();
		});

		it("should return null if metrics disabled", () => {
			const metric = new MetricRegistry(broker, { enabled: false, collectProcessMetrics: false });
			metric.register({ name: "test.first", type: "counter" });
			metric.register({ name: "test.second", type: "gauge" });

			expect(metric.getMetric("test.first")).toBeNull();
			expect(metric.getMetric("test.second")).toBeNull();
			expect(metric.getMetric("test.third")).toBeNull();
		});

	});

	describe("Test increment method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const counter = metric.register({ type: "counter", name: "test.counter" });
		counter.increment = jest.fn();

		it("should call increment method without params", () => {
			metric.increment("test.counter");

			expect(counter.increment).toHaveBeenCalledTimes(1);
			expect(counter.increment).toHaveBeenCalledWith(undefined, 1, undefined);
		});

		it("should call increment method with params", () => {
			counter.increment.mockClear();
			const now = Date.now();
			metric.increment("test.counter", { a: 5 }, 3, now);

			expect(counter.increment).toHaveBeenCalledTimes(1);
			expect(counter.increment).toHaveBeenCalledWith({ a: 5 }, 3, now);
		});

		it("should throw error if increment method is not exist", () => {
			metric.register({ type: "histogram", name: "test.histogram" });
			expect(() => metric.increment("test.histogram")).toThrow("Invalid metric type. Incrementing works only with counter & gauge metric types.");
		});

		it("should not call increment method if metric disabled", () => {
			counter.increment.mockClear();
			metric.opts.enabled = false;

			metric.increment("test.counter");

			expect(counter.increment).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test decrement method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const gauge = metric.register({ type: "gauge", name: "test.gauge" });
		gauge.decrement = jest.fn();

		it("should call decrement method without params", () => {
			metric.decrement("test.gauge");

			expect(gauge.decrement).toHaveBeenCalledTimes(1);
			expect(gauge.decrement).toHaveBeenCalledWith(undefined, 1, undefined);
		});

		it("should call decrement method with params", () => {
			gauge.decrement.mockClear();
			const now = Date.now();
			metric.decrement("test.gauge", { a: 5 }, 3, now);

			expect(gauge.decrement).toHaveBeenCalledTimes(1);
			expect(gauge.decrement).toHaveBeenCalledWith({ a: 5 }, 3, now);
		});

		it("should throw error if metric has no decrement method", () => {
			metric.register({ type: "counter", name: "test.counter" });

			expect(() => metric.decrement("test.counter")).toThrow("Counter can't be decreased.");
		});

		it("should throw error if decrement method is not exist", () => {
			metric.register({ type: "histogram", name: "test.histogram" });
			expect(() => metric.decrement("test.histogram")).toThrow("Invalid metric type. Decrementing works only with gauge metric type.");
		});

		it("should not call decrement method if metric disabled", () => {
			gauge.decrement.mockClear();
			metric.opts.enabled = false;

			metric.decrement("test.gauge");

			expect(gauge.decrement).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test set method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const info = metric.register({ type: "info", name: "test.info" });
		info.set = jest.fn();

		it("should call set method without params", () => {
			metric.set("test.info", 8);

			expect(info.set).toHaveBeenCalledTimes(1);
			expect(info.set).toHaveBeenCalledWith(8, undefined, undefined);
		});

		it("should call set method with params", () => {
			info.set.mockClear();
			const now = Date.now();
			metric.set("test.info", 8, { a: 5 }, now);

			expect(info.set).toHaveBeenCalledTimes(1);
			expect(info.set).toHaveBeenCalledWith(8, { a: 5 }, now);
		});

		it("should throw error if set method is not exist", () => {
			metric.register({ type: "histogram", name: "test.histogram" });
			expect(() => metric.set("test.histogram")).toThrow("Invalid metric type. Value setting works only with counter, gauge & info metric types.");
		});

		it("should not call set method if metric disabled", () => {
			info.set.mockClear();
			metric.opts.enabled = false;

			metric.set("test.info");

			expect(info.set).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test observe method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const histogram = metric.register({ type: "histogram", name: "test.histogram" });
		histogram.observe = jest.fn();

		it("should call observe method without params", () => {
			metric.observe("test.histogram", 8);

			expect(histogram.observe).toHaveBeenCalledTimes(1);
			expect(histogram.observe).toHaveBeenCalledWith(8, undefined, undefined);
		});

		it("should call observe method with params", () => {
			histogram.observe.mockClear();
			const now = Date.now();
			metric.observe("test.histogram", 8, { a: 5 }, now);

			expect(histogram.observe).toHaveBeenCalledTimes(1);
			expect(histogram.observe).toHaveBeenCalledWith(8, { a: 5 }, now);
		});

		it("should throw error if observe method is not exist", () => {
			metric.register({ type: "counter", name: "test.counter" });
			expect(() => metric.observe("test.counter")).toThrow("Invalid metric type. Observing works only with histogram metric type.");
		});

		it("should not call observe method if metric disabled", () => {
			histogram.observe.mockClear();
			metric.opts.enabled = false;

			metric.observe("test.histogram");

			expect(histogram.observe).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test reset method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const histogram = metric.register({ type: "histogram", name: "test.histogram" });
		histogram.reset = jest.fn();

		it("should call reset method without params", () => {
			metric.reset("test.histogram", 8);

			expect(histogram.reset).toHaveBeenCalledTimes(1);
			expect(histogram.reset).toHaveBeenCalledWith(8, undefined);
		});

		it("should call reset method with params", () => {
			histogram.reset.mockClear();
			metric.reset("test.histogram", 8, { a: 5 });

			expect(histogram.reset).toHaveBeenCalledTimes(1);
			expect(histogram.reset).toHaveBeenCalledWith(8, { a: 5 });
		});

		it("should not call reset method if metric disabled", () => {
			histogram.reset.mockClear();
			metric.opts.enabled = false;

			metric.reset("test.histogram");

			expect(histogram.reset).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test resetAll method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const histogram = metric.register({ type: "histogram", name: "test.histogram" });
		histogram.resetAll = jest.fn();

		it("should call resetAll method without params", () => {
			metric.resetAll("test.histogram");

			expect(histogram.resetAll).toHaveBeenCalledTimes(1);
			expect(histogram.resetAll).toHaveBeenCalledWith(undefined);
		});

		it("should call resetAll method with params", () => {
			histogram.resetAll.mockClear();
			const now = Date.now();
			metric.resetAll("test.histogram", now);

			expect(histogram.resetAll).toHaveBeenCalledTimes(1);
			expect(histogram.resetAll).toHaveBeenCalledWith(now);
		});

		it("should not call resetAll method if metric disabled", () => {
			histogram.resetAll.mockClear();
			metric.opts.enabled = false;

			metric.resetAll("test.histogram");

			expect(histogram.resetAll).toHaveBeenCalledTimes(0);
		});

	});

	describe("Test timer method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, { collectProcessMetrics: false });

		const gauge = metric.register({ type: "gauge", name: "test.gauge" });
		gauge.set = jest.fn();

		const histogram = metric.register({ type: "histogram", name: "test.histogram" });
		histogram.observe = jest.fn();

		it("should call gauge.set method", () => {
			const timeEnd = metric.timer("test.gauge");
			expect(gauge.set).toHaveBeenCalledTimes(0);

			const duration = timeEnd();
			expect(duration).toBeGreaterThan(0.001);
			expect(gauge.set).toHaveBeenCalledTimes(1);
			expect(gauge.set).toHaveBeenCalledWith(expect.any(Number), undefined, undefined);
		});

		it("should call gauge.set method with params", () => {
			gauge.set.mockClear();
			const now = Date.now();
			const timeEnd = metric.timer("test.gauge", { a: 5 }, now);
			expect(gauge.set).toHaveBeenCalledTimes(0);

			const duration = timeEnd();
			expect(duration).toBeGreaterThan(0.001);
			expect(gauge.set).toHaveBeenCalledTimes(1);
			expect(gauge.set).toHaveBeenCalledWith(expect.any(Number), { a: 5 }, now);

		});

		it("should call histogram.observe method", () => {
			const timeEnd = metric.timer("test.histogram");
			expect(histogram.observe).toHaveBeenCalledTimes(0);

			const duration = timeEnd();
			expect(duration).toBeGreaterThan(0.001);
			expect(histogram.observe).toHaveBeenCalledTimes(1);
			expect(histogram.observe).toHaveBeenCalledWith(expect.any(Number), undefined, undefined);
		});

		it("should call histogram.observe method with params", () => {
			histogram.observe.mockClear();
			const now = Date.now();
			const timeEnd = metric.timer("test.histogram", { a: 5 }, now);
			expect(histogram.observe).toHaveBeenCalledTimes(0);

			const duration = timeEnd();
			expect(duration).toBeGreaterThan(0.001);
			expect(histogram.observe).toHaveBeenCalledTimes(1);
			expect(histogram.observe).toHaveBeenCalledWith(expect.any(Number), { a: 5 }, now);
		});

		it("should not call gauge.set method if metric disabled", () => {
			gauge.set.mockClear();
			metric.opts.enabled = false;

			const timeEnd = metric.timer("test.gauge");
			expect(gauge.set).toHaveBeenCalledTimes(0);

			const duration = timeEnd();
			expect(duration).toBeGreaterThan(0.001);
			expect(gauge.set).toHaveBeenCalledTimes(0);
		});

	});


	describe("Test changed method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, {
			reporter: ["Event", "CSV"],
			collectProcessMetrics: false
		});
		metric.init();

		metric.reporter[0].metricChanged = jest.fn();
		metric.reporter[1].metricChanged = jest.fn();

		const labels = { a: 5 };

		it("should call metricChanged method of reporters", () => {
			metric.changed("test.counter", 5.3, labels, 123456);

			expect(metric.reporter[0].metricChanged).toHaveBeenCalledTimes(1);
			expect(metric.reporter[0].metricChanged).toHaveBeenCalledWith("test.counter", 5.3, labels, 123456);

			expect(metric.reporter[1].metricChanged).toHaveBeenCalledTimes(1);
			expect(metric.reporter[1].metricChanged).toHaveBeenCalledWith("test.counter", 5.3, labels, 123456);
		});

	});

	describe("Test list method", () => {

		const broker = new ServiceBroker({ logger: false });
		const registry = new MetricRegistry(broker, {
			collectProcessMetrics: false
		});
		registry.init();

		const mockToObject = function() {
			return {
				name: this.name,
				type: this.type
			};
		};

		registry.register({ name: "os.datetime.utc", type: "gauge" }).toObject = mockToObject;
		registry.register({ name: "test.info", type: "info", description: "Test Info Metric" }).toObject = mockToObject;
		registry.register({ name: "test.counter", type: "counter", labelNames: ["action"], description: "Test Counter Metric" }).toObject = mockToObject;
		registry.register({ name: "test.gauge-total", type: "gauge", labelNames: ["action"], description: "Test Gauge Metric" }).toObject = mockToObject;
		registry.register({ name: "test.histogram", type: "histogram", labelNames: ["action"], buckets: true, quantiles: true, unit: "bytes" }).toObject = mockToObject;

		it("should list all metrics", () => {
			const res = registry.list();

			expect(res).toEqual([
				{ "name": "os.datetime.utc", "type": "gauge" },
				{ "name": "test.info", "type": "info" },
				{ "name": "test.counter", "type": "counter" },
				{ "name": "test.gauge-total", "type": "gauge" },
				{ "name": "test.histogram", "type": "histogram" }
			]);
		});

		it("should filtering type", () => {
			const res = registry.list({ types: "counter" });

			expect(res).toEqual([
				{ "name": "test.counter", "type": "counter" },
			]);
		});

		it("should filtering types", () => {
			const res = registry.list({ types: ["counter", "histogram"] });

			expect(res).toEqual([
				{ "name": "test.counter", "type": "counter" },
				{ "name": "test.histogram", "type": "histogram" }
			]);
		});

		it("should filtering includes", () => {
			const res = registry.list({ includes: "test.counter" });

			expect(res).toEqual([
				{ "name": "test.counter", "type": "counter" },
			]);
		});

		it("should filtering multi includes", () => {
			const res = registry.list({ includes: ["test.co**", "os.**"] });

			expect(res).toEqual([
				{ "name": "os.datetime.utc", "type": "gauge" },
				{ "name": "test.counter", "type": "counter" },
			]);
		});

		it("should filtering excludes", () => {
			const res = registry.list({ excludes: "test.**" });

			expect(res).toEqual([
				{ "name": "os.datetime.utc", "type": "gauge" },
			]);
		});

		it("should filtering multi excludes", () => {
			const res = registry.list({ excludes: ["test.counter", "os.**"] });

			expect(res).toEqual([
				{ "name": "test.info", "type": "info" },
				{ "name": "test.gauge-total", "type": "gauge" },
				{ "name": "test.histogram", "type": "histogram" }
			]);
		});

		it("should filtering all", () => {
			const res = registry.list({
				types: ["counter", "gauge"] ,
				includes: "test.**" ,
				excludes: ["test.counter"]
			});

			expect(res).toEqual([
				{ "name": "test.gauge-total", "type": "gauge" },
			]);
		});

	});

	describe("Test pluralizeUnit method", () => {

		const broker = new ServiceBroker({ logger: false });
		const metric = new MetricRegistry(broker, {});
		metric.init();

		it("should pluralize units", () => {
			expect(metric.pluralizeUnit(METRIC.UNIT_REQUEST)).toBe("requests");
			expect(metric.pluralizeUnit(METRIC.UNIT_BYTE)).toBe("bytes");
			expect(metric.pluralizeUnit(METRIC.UNIT_GHZ)).toBe("GHz");
		});

	});
});

