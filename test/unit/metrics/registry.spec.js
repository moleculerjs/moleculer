const MetricCommons = require("../../../src/metrics/commons");
jest.spyOn(MetricCommons, "registerCommonMetrics");
jest.spyOn(MetricCommons, "updateCommonMetrics");

const ServiceBroker = require("../../../src/service-broker");
const MetricRegistry = require("../../../src/metrics/registry");
const MetricTypes = require("../../../src/metrics/types");
const MetricReporters = require("../../../src/metrics/reporters");

const lolex = require("lolex");
const Promise = require("bluebird");


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

			clock.tick(metric.opts.collectInterval + 100);

			expect(MetricCommons.registerCommonMetrics).toHaveBeenCalledTimes(1);
			expect(MetricCommons.updateCommonMetrics).toHaveBeenCalledTimes(2);
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
	});
});

