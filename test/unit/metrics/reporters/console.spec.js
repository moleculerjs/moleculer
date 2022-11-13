"use strict";

const lolex = require("@sinonjs/fake-timers");

const ConsoleReporter = require("../../../../src/metrics/reporters/console");
const ServiceBroker = require("../../../../src/service-broker");
const MetricRegistry = require("../../../../src/metrics/registry");

describe("Test ConsoleReporter class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const reporter = new ConsoleReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,

				interval: 5,
				logger: null,
				colors: true,
				onlyChanges: true
			});
			expect(reporter.lastChanges).toBeInstanceOf(Set);
		});

		it("should create with custom options", () => {
			const reporter = new ConsoleReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},

				interval: 10,
				logger: {},
				colors: false,
				onlyChanges: false
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),

				interval: 10,
				logger: {},
				colors: false,
				onlyChanges: false
			});
		});
	});

	describe("Test init method", () => {
		let clock;
		beforeAll(() => (clock = lolex.install()));
		afterAll(() => clock.uninstall());

		it("should start timer", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new ConsoleReporter({ interval: 2 });
			reporter.print = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeDefined();
			expect(reporter.print).toBeCalledTimes(0);

			clock.tick(2500);

			expect(reporter.print).toBeCalledTimes(1);
		});

		it("should not start timer", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new ConsoleReporter({ interval: 0 });
			reporter.print = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeUndefined();
			expect(reporter.print).toBeCalledTimes(0);

			clock.tick(2500);

			expect(reporter.print).toBeCalledTimes(0);
		});
	});

	describe("Test print method", () => {
		let clock;
		beforeAll(() => (clock = lolex.install({ now: 12345678000 })));
		afterAll(() => clock.uninstall());

		let LOG_STORE = [];
		const logger = jest.fn((...args) => LOG_STORE.push(args.join(" ")));

		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);

		it("should print lines to the logger", () => {
			const reporter = new ConsoleReporter({
				interval: 0,
				colors: false,
				onlyChanges: false,
				logger
			});
			reporter.init(registry);

			registry.register({ name: "os.datetime.utc", type: "gauge" }).set(123456);
			registry
				.register({ name: "test.info", type: "info", description: "Test Info Metric" })
				.set("Test Value");

			registry.register({
				name: "test.counter",
				type: "counter",
				labelNames: ["action"],
				description: "Test Counter Metric"
			});
			registry.increment("test.counter", null, 5);
			registry.increment("test.counter", { action: "posts\\comments" }, 8);

			registry.register({
				name: "test.gauge-total",
				type: "gauge",
				labelNames: ["action"],
				description: "Test Gauge Metric"
			});
			registry.decrement("test.gauge-total", { action: 'users-"John"' }, 8);
			registry.set("test.gauge-total", { action: "posts" }, null);

			registry.register({
				name: "test.histogram",
				type: "histogram",
				labelNames: ["action"],
				buckets: true,
				quantiles: true,
				unit: "byte"
			});
			registry.observe("test.histogram", 8, null);
			registry.observe("test.histogram", 2, null);
			registry.observe("test.histogram", 6, null);
			registry.observe("test.histogram", 2, null);

			registry.observe("test.histogram", 1, { action: "auth" });
			registry.observe("test.histogram", 3, { action: "auth" });
			registry.observe("test.histogram", 7, { action: "auth" });

			reporter.print();

			expect(LOG_STORE).toMatchSnapshot();
		});
	});

	describe("Test print method with onlyChanges", () => {
		let clock;
		beforeAll(() => (clock = lolex.install({ now: 12345678000 })));
		afterAll(() => clock.uninstall());

		let LOG_STORE = [];
		const logger = jest.fn((...args) => LOG_STORE.push(args.join(" ")));

		const broker = new ServiceBroker({
			logger: false,
			nodeID: "node-123",
			metrics: {
				enabled: true,
				reporter: {
					type: "Console",
					options: {
						interval: 0,
						colors: false,
						onlyChanges: true,
						logger,
						excludes: ["moleculer.node.versions.moleculer"]
					}
				}
			}
		});
		const registry = broker.metrics;
		const reporter = registry.reporter[0];

		it("should not print lines to the logger", () => {
			registry.register({ name: "os.datetime.utc", type: "gauge" }).set(123456);
			registry
				.register({ name: "test.info", type: "info", description: "Test Info Metric" })
				.set("Test Value");

			registry.register({
				name: "test.counter",
				type: "counter",
				labelNames: ["action"],
				description: "Test Counter Metric"
			});
			registry.increment("test.counter", null, 5);
			registry.increment("test.counter", { action: "posts\\comments" }, 8);

			registry.register({
				name: "test.gauge-total",
				type: "gauge",
				labelNames: ["action"],
				description: "Test Gauge Metric"
			});
			registry.decrement("test.gauge-total", { action: 'users-"John"' }, 8);
			registry.set("test.gauge-total", { action: "posts" }, null);

			registry.register({
				name: "test.histogram",
				type: "histogram",
				labelNames: ["action"],
				buckets: true,
				quantiles: true,
				unit: "byte"
			});
			registry.observe("test.histogram", 8, null);
			registry.observe("test.histogram", 2, null);
			registry.observe("test.histogram", 6, null);
			registry.observe("test.histogram", 2, null);

			registry.observe("test.histogram", 1, { action: "auth" });
			registry.observe("test.histogram", 3, { action: "auth" });
			registry.observe("test.histogram", 7, { action: "auth" });

			reporter.print();

			expect(LOG_STORE).toMatchSnapshot();
		});

		it("should print changes only", () => {
			LOG_STORE = [];

			registry.increment("test.counter", null, 7);
			registry.decrement("test.gauge-total", { action: "posts" }, 5);

			expect(reporter.lastChanges.size).toBe(2);

			reporter.print();

			expect(LOG_STORE).toMatchSnapshot();
			expect(reporter.lastChanges.size).toBe(0);
		});
	});
});
