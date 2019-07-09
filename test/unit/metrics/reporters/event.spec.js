"use strict";

const lolex = require("lolex");

const EventReporter = require("../../../../src/metrics/reporters/event");
const ServiceBroker = require("../../../../src/service-broker");
const MetricRegistry = require("../../../../src/metrics/registry");

describe("Test EventReporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const reporter = new EventReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,

				eventName: "$metrics.snapshot",
				broadcast: false,
				groups: null,
				onlyChanges: false,
				interval: 5 * 1000,
			});

			expect(reporter.lastChanges).toBeInstanceOf(Set);
		});

		it("should create with custom options", () => {
			const reporter = new EventReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},

				eventName: "$metrics.state",
				broadcast: true,
				groups: ["payments"],
				onlyChanges: true,
				interval: 10 * 1000,
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),

				eventName: "$metrics.state",
				broadcast: true,
				groups: ["payments"],
				onlyChanges: true,
				interval: 10 * 1000,
			});
		});

	});

	describe("Test init method", () => {
		let clock;
		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		it("should start timer", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new EventReporter({ interval: 2000 });
			reporter.sendEvent = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeDefined();
			expect(reporter.sendEvent).toBeCalledTimes(0);

			clock.tick(2500);

			expect(reporter.sendEvent).toBeCalledTimes(1);
		});

		it("should not start timer", () => {
			const fakeBroker = {
				nodeID: "node-123",
				namespace: "test-ns"
			};
			const fakeRegistry = { broker: fakeBroker };
			const reporter = new EventReporter({ interval: 0 });
			reporter.sendEvent = jest.fn();
			reporter.init(fakeRegistry);

			expect(reporter.timer).toBeUndefined();
			expect(reporter.sendEvent).toBeCalledTimes(0);

			clock.tick(2500);

			expect(reporter.sendEvent).toBeCalledTimes(0);
		});

	});

	describe("Test sendEvent method", () => {
		let clock;
		beforeAll(() => clock = lolex.install({ now: 12345678000 }));
		afterAll(() => clock.uninstall());

		const broker = new ServiceBroker({ logger: false, nodeID: "node-123" });
		const registry = new MetricRegistry(broker);

		broker.broadcast = jest.fn();
		broker.emit = jest.fn();

		it("should call broker emit with changes", () => {

			const reporter = new EventReporter({
				interval: 0,
				onlyChanges: false,
				broadcast: false,
				groups: ["mail", "stat"]
			});
			reporter.init(registry);

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

			reporter.sendEvent();

			expect(broker.broadcast).toHaveBeenCalledTimes(0);
			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("$metrics.snapshot", expect.any(Array), { groups: ["mail", "stat"] });

			expect(broker.emit.mock.calls[0][1]).toMatchSnapshot();
		});

	});

	describe("Test sendEvent method with onlyChanges", () => {
		let clock, broker, registry, reporter;
		beforeAll(() => {
			clock = lolex.install({ now: 12345678000 });

			broker = new ServiceBroker({
				logger: false,
				nodeID: "node-123",
				metrics: {
					reporter: {
						type: "Event",
						options: {
							eventName: "$metrics.custom",
							interval: 0,
							onlyChanges: true,
							broadcast: true,
							excludes: ["moleculer.node.versions.moleculer"]
						}
					}
				}
			});

			broker.broadcast = jest.fn();
			broker.emit = jest.fn();

			registry = broker.metrics;
			reporter = registry.reporter[0];
		});
		afterAll(() => clock.uninstall());

		it("should call broker.broadcast", () => {
			broker.emit.mockClear();

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

			reporter.sendEvent();

			expect(broker.emit).toHaveBeenCalledTimes(0);
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$metrics.custom", expect.any(Array), { groups: null });

			expect(broker.broadcast.mock.calls[0][1]).toMatchSnapshot();

		});

		it("should send changes only", () => {
			broker.broadcast.mockClear();

			registry.increment("test.counter", null, 7);
			registry.decrement("test.gauge-total", { action: "posts" }, 5);

			expect(reporter.lastChanges.size).toBe(2);

			reporter.sendEvent();

			expect(broker.emit).toHaveBeenCalledTimes(0);
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$metrics.custom", expect.any(Array), { groups: null });

			expect(broker.broadcast.mock.calls[0][1]).toMatchSnapshot();
			expect(reporter.lastChanges.size).toBe(0);
		});

		it("should send changes with groups", () => {
			reporter.opts.groups = ["mail", "stat"];
			broker.broadcast.mockClear();

			registry.increment("test.counter", null, 7);
			registry.decrement("test.gauge-total", { action: "posts" }, 5);

			expect(reporter.lastChanges.size).toBe(2);

			reporter.sendEvent();

			expect(broker.emit).toHaveBeenCalledTimes(0);
			expect(broker.broadcast).toHaveBeenCalledTimes(1);
			expect(broker.broadcast).toHaveBeenCalledWith("$metrics.custom", expect.any(Array), { groups: ["mail", "stat"] });
		});

	});

});
