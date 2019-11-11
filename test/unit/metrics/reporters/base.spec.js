"use strict";

const BaseReporter = require("../../../../src/metrics/reporters/base");

describe("Test Base Reporter class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const reporter = new BaseReporter();

			expect(reporter.opts).toEqual({
				includes: null,
				excludes: null,

				metricNamePrefix: null,
				metricNameSuffix: null,

				metricNameFormatter: null,
				labelNameFormatter: null,
			});
		});

		it("should create with custom options", () => {
			const reporter = new BaseReporter({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: "moleculer.**",
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: () => {},
				labelNameFormatter: () => {},
			});

			expect(reporter.opts).toEqual({
				metricNamePrefix: "mol-",
				metricNameSuffix: ".data",
				includes: ["moleculer.**"],
				excludes: ["moleculer.circuit-breaker.**", "moleculer.custom.**"],
				metricNameFormatter: expect.any(Function),
				labelNameFormatter: expect.any(Function),
			});
		});

	});

	describe("Test init & stop methods", () => {

		it("init - should set internal variables", () => {
			const fakeBroker = {};
			const fakeRegistry = { broker: fakeBroker, logger: {} };
			const reporter = new BaseReporter();
			reporter.init(fakeRegistry);

			expect(reporter.registry).toBe(fakeRegistry);
			expect(reporter.broker).toBe(fakeBroker);
			expect(reporter.logger).toBe(fakeRegistry.logger);
		});

		it("stop - should return a promise", () => {
			const reporter = new BaseReporter();
			expect(reporter.stop()).toBeInstanceOf(Promise)
		})
	});

	describe("Test matchMetricName method", () => {

		it("should match included metrics", () => {
			const reporter = new BaseReporter({
				includes: "moleculer.broker.**"
			});

			expect(reporter.matchMetricName("moleculer.node.type")).toBe(false);
			expect(reporter.matchMetricName("moleculer.broker.namespace")).toBe(true);
			expect(reporter.matchMetricName("moleculer.broker.local.services.total")).toBe(true);
			expect(reporter.matchMetricName("os.cpu.info.times.sys")).toBe(false);
		});

		it("should not match excluded metrics", () => {
			const reporter = new BaseReporter({
				excludes: [
					"moleculer.broker.**",
					"process.eventloop.**"
				]
			});

			expect(reporter.matchMetricName("moleculer.node.type")).toBe(true);
			expect(reporter.matchMetricName("moleculer.broker.namespace")).toBe(false);
			expect(reporter.matchMetricName("moleculer.broker.local.services.total")).toBe(false);
			expect(reporter.matchMetricName("os.cpu.info.times.sys")).toBe(true);
			expect(reporter.matchMetricName("process.eventloop.lag.min")).toBe(false);
		});

		it("should match included & excluded metrics", () => {
			const reporter = new BaseReporter({
				includes: [
					"moleculer.**.total"
				],
				excludes: [
					"moleculer.broker.**",
					"moleculer.request.**"
				]
			});

			expect(reporter.matchMetricName("moleculer.registry.nodes.total")).toBe(true);
			expect(reporter.matchMetricName("moleculer.broker.namespace")).toBe(false);
			expect(reporter.matchMetricName("moleculer.broker.local.services.total")).toBe(false);
			expect(reporter.matchMetricName("moleculer.request.timeout.total")).toBe(false);
			expect(reporter.matchMetricName("moleculer.request.bulkhead.inflight")).toBe(false);
			expect(reporter.matchMetricName("moleculer.cacher.get.total")).toBe(true);
			expect(reporter.matchMetricName("moleculer.cacher.get.time")).toBe(false);
			expect(reporter.matchMetricName("os.cpu.info.times.sys")).toBe(false);
		});

	});

	describe("Test formatMetricName method", () => {

		it("should not format metric name", () => {
			const reporter = new BaseReporter({});

			expect(reporter.formatMetricName("moleculer.node.type")).toBe("moleculer.node.type");
			expect(reporter.formatMetricName("")).toBe("");
		});

		it("should format metric name with prefix & suffix", () => {
			const reporter = new BaseReporter({
				metricNamePrefix: "mol:",
				metricNameSuffix: ".value"
			});

			expect(reporter.formatMetricName("moleculer.node.type")).toBe("mol:moleculer.node.type.value");
			expect(reporter.formatMetricName("")).toBe("mol:.value");
		});

		it("should format metric name with custom formatter", () => {
			const reporter = new BaseReporter({
				metricNamePrefix: "mol:",
				metricNameSuffix: ".value",
				metricNameFormatter: name => name.toUpperCase().replace(/[.:]/g, "_")
			});

			expect(reporter.formatMetricName("moleculer.node.type")).toBe("MOL_MOLECULER_NODE_TYPE_VALUE");
			expect(reporter.formatMetricName("")).toBe("MOL__VALUE");
		});

	});

	describe("Test formatLabelName method", () => {

		it("should not format label name", () => {
			const reporter = new BaseReporter();

			expect(reporter.formatLabelName("action.name")).toBe("action.name");
			expect(reporter.formatLabelName("")).toBe("");
		});

		it("should format label name with custom formatter", () => {
			const reporter = new BaseReporter({
				labelNameFormatter: name => name.toUpperCase().replace(/[.:]/g, "_")
			});

			expect(reporter.formatLabelName("action.name")).toBe("ACTION_NAME");
			expect(reporter.formatLabelName("")).toBe("");
		});

	});
});
