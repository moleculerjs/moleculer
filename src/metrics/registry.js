/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { match, isFunction, isPlainObject, isString } = require("../utils");
const METRIC = require("./constants");
const Types = require("./types");
const Reporters = require("./reporters");
const { registerCommonMetrics, updateCommonMetrics } = require("./commons");

const METRIC_NAME_REGEXP = /^[a-zA-Z_][a-zA-Z0-9-_:.]*$/;
const METRIC_LABEL_REGEXP = /^[a-zA-Z_][a-zA-Z0-9-_.]*$/;

/**
 * Import types
 *
 * @typedef {import("./registry")} MetricRegistryClass
 * @typedef {import("./registry").MetricListOptions} MetricListOptions
 * @typedef {import("./registry").GaugeMetricOptions} GaugeMetricOptions
 * @typedef {import("./registry").CounterMetricOptions} CounterMetricOptions
 * @typedef {import("./registry").HistogramMetricOptions} HistogramMetricOptions
 * @typedef {import("./registry").InfoMetricOptions} InfoMetricOptions
 *
 * @typedef {import("./types/counter")} CounterMetric
 * @typedef {import("./types/gauge")} GaugeMetric
 * @typedef {import("./types/histogram")} HistogramMetric
 * @typedef {import("./types/info")} InfoMetric
 * @typedef {import("./types/base")} BaseMetric
 * @typedef {import("./types/base").BaseMetricOptions} BaseMetricOptions
 *
 * @typedef {import("../service-broker")} ServiceBroker
 */

/**
 * Metric Registry class
 *
 * @class MetricRegistry
 * @implements {MetricRegistryClass}
 */
class MetricRegistry {
	/**
	 * Creates an instance of MetricRegistry.
	 *
	 * @param {ServiceBroker} broker
	 * @param {Object} opts
	 * @memberof MetricRegistry
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("metrics");

		this.dirty = true;

		if (opts === true || opts === false) opts = { enabled: opts };

		this.opts = _.defaultsDeep({}, opts, {
			enabled: true,
			collectProcessMetrics: process.env.NODE_ENV !== "test",
			collectInterval: 5,

			reporter: false,

			defaultBuckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // in milliseconds
			defaultQuantiles: [0.5, 0.9, 0.95, 0.99, 0.999], // percentage
			defaultMaxAgeSeconds: 60,
			defaultAgeBuckets: 10,
			defaultAggregator: "sum"
		});

		this.store = new Map();

		if (this.opts.enabled) this.logger.info("Metrics: Enabled");
	}

	/**
	 * Initialize Registry.
	 */
	init() {
		if (this.opts.enabled) {
			// Create Reporter instances
			if (this.opts.reporter) {
				const reporters = Array.isArray(this.opts.reporter)
					? this.opts.reporter
					: [this.opts.reporter];

				this.reporter = _.compact(reporters).map(r => {
					const reporter = Reporters.resolve(r);
					reporter.init(this);
					return reporter;
				});

				const reporterNames = this.reporter.map(reporter =>
					this.broker.getConstructorName(reporter)
				);
				this.logger.info(
					`Metric reporter${reporterNames.length > 1 ? "s" : ""}: ${reporterNames.join(
						", "
					)}`
				);
			}

			// Start colllect timer
			if (this.opts.collectProcessMetrics) {
				this.collectTimer = setInterval(() => {
					updateCommonMetrics.call(this);
				}, this.opts.collectInterval * 1000);
				this.collectTimer.unref();

				registerCommonMetrics.call(this);
				updateCommonMetrics.call(this);
			}
		}
	}

	/**
	 * Stop Metric Registry
	 */
	stop() {
		if (this.collectTimer) {
			clearInterval(this.collectTimer);
		}

		if (this.reporter) {
			return this.broker.Promise.all(this.reporter.map(r => r.stop()));
		}
	}

	/**
	 * Check metric is enabled?
	 *
	 * @returns
	 * @memberof MetricRegistry
	 */
	isEnabled() {
		return this.opts.enabled;
	}

	/**
	 * Register a new metric.
	 *
	 * @param {GaugeMetricOptions|CounterMetricOptions|HistogramMetricOptions|InfoMetricOptions} opts
	 * @returns {CounterMetric | GaugeMetric | HistogramMetric | InfoMetric}
	 * @memberof MetricRegistry
	 */
	register(opts) {
		if (!isPlainObject(opts)) throw new Error("Wrong argument. Must be an Object.");

		if (!opts.type) throw new Error("The metric 'type' property is mandatory.");

		if (!opts.name) throw new Error("The metric 'name' property is mandatory.");

		if (!METRIC_NAME_REGEXP.test(opts.name))
			throw new Error("The metric 'name' is not valid: " + opts.name);

		if (Array.isArray(opts.labelNames)) {
			opts.labelNames.forEach(name => {
				if (!METRIC_LABEL_REGEXP.test(name))
					throw new Error(`The '${opts.name}' metric label name is not valid: ${name}`);
			});
		}

		const MetricClass = Types.resolve(opts.type);

		if (!this.opts.enabled) return null;

		const item = new MetricClass(opts, this);
		this.store.set(opts.name, item);
		return item;
	}

	/**
	 * Check a metric by name.
	 *
	 * @param {String} name
	 * @returns {Boolean}
	 * @memberof MetricRegistry
	 */
	hasMetric(name) {
		return this.store.has(name);
	}

	/**
	 * Get metric by name
	 *
	 * @param {String} name
	 * @returns {CounterMetric | GaugeMetric | HistogramMetric | InfoMetric}
	 * @memberof MetricRegistry
	 */
	getMetric(name) {
		const item = this.store.get(name);
		if (!item) return null;

		return item;
	}

	/**
	 * Increment a metric value.
	 *
	 * @param {String} name
	 * @param {Object=} labels
	 * @param {number=} [value=1]
	 * @param {Number=} timestamp
	 * @returns
	 * @memberof MetricRegistry
	 */
	increment(name, labels, value = 1, timestamp) {
		if (!this.opts.enabled) return null;

		/** @type {GaugeMetric} */
		const item = this.getMetric(name);
		if (!isFunction(item.increment))
			throw new Error(
				"Invalid metric type. Incrementing works only with counter & gauge metric types."
			);

		return item.increment(labels, value, timestamp);
	}

	/**
	 * Decrement a metric value.
	 *
	 * @param {String} name
	 * @param {Object=} labels
	 * @param {number=} [value=1]
	 * @param {Number=} timestamp
	 * @returns
	 * @memberof MetricRegistry
	 */
	decrement(name, labels, value = 1, timestamp) {
		if (!this.opts.enabled) return null;

		/** @type {GaugeMetric} */
		const item = this.getMetric(name);
		if (!isFunction(item.decrement))
			throw new Error("Invalid metric type. Decrementing works only with gauge metric type.");

		return item.decrement(labels, value, timestamp);
	}

	/**
	 * Set a metric value.
	 *
	 * @param {String} name
	 * @param {any} value
	 * @param {Object=} labels
	 * @param {Number=} timestamp
	 * @returns
	 * @memberof MetricRegistry
	 */
	set(name, value, labels, timestamp) {
		if (!this.opts.enabled) return null;

		const item = this.getMetric(name);
		if (!isFunction(item.set))
			throw new Error(
				"Invalid metric type. Value setting works only with counter, gauge & info metric types."
			);

		return item.set(value, labels, timestamp);
	}

	/**
	 * Observe a metric.
	 *
	 * @param {String} name
	 * @param {Number} value
	 * @param {Object=} labels
	 * @param {Number=} timestamp
	 * @returns
	 * @memberof MetricRegistry
	 */
	observe(name, value, labels, timestamp) {
		if (!this.opts.enabled) return null;

		/** @type {HistogramMetric} */
		const item = this.getMetric(name);
		if (!isFunction(item.observe))
			throw new Error(
				"Invalid metric type. Observing works only with histogram metric type."
			);

		return item.observe(value, labels, timestamp);
	}

	/**
	 * Reset metric values.
	 *
	 * @param {String} name
	 * @param {Object?} labels
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof MetricRegistry
	 */
	reset(name, labels, timestamp) {
		if (!this.opts.enabled) return null;

		const item = this.getMetric(name);
		item.reset(labels, timestamp);
	}

	/**
	 * Reset metric all values.
	 *
	 * @param {String} name
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof MetricRegistry
	 */
	resetAll(name, timestamp) {
		if (!this.opts.enabled) return null;

		const item = this.getMetric(name);
		item.resetAll(timestamp);
	}

	/**
	 * Start a timer & observe the elapsed time.
	 *
	 * @param {String} name
	 * @param {Object?} labels
	 * @param {Number?} timestamp
	 * @returns {() => number} `end`˙function.
	 * @memberof MetricRegistry
	 */
	timer(name, labels, timestamp) {
		let item;
		if (name && this.opts.enabled) {
			item = this.getMetric(name);
			if (!isFunction(item.observe) && !isFunction(item.set)) {
				/* istanbul ignore next */
				throw new Error(
					"Invalid metric type. Timing works only with histogram or gauge metric types"
				);
			}
		}

		const start = process.hrtime();
		return () => {
			const delta = process.hrtime(start);
			const duration = (delta[0] + delta[1] / 1e9) * 1000;

			if (item) {
				if (item.type == METRIC.TYPE_HISTOGRAM) item.observe(duration, labels, timestamp);
				else if (item.type == METRIC.TYPE_GAUGE) item.set(duration, labels, timestamp);
			}

			return duration;
		};
	}

	/**
	 * Some metric has been changed.
	 *
	 * @param {BaseMetric} metric
	 * @param {any} value
	 * @param {Object} labels
	 * @param {Number?} timestamp
	 *
	 * @memberof MetricRegistry
	 */
	changed(metric, value, labels, timestamp) {
		this.dirty = true;
		if (Array.isArray(this.reporter))
			this.reporter.forEach(reporter =>
				reporter.metricChanged(metric, value, labels, timestamp)
			);
	}

	/**
	 * List all registered metrics with labels & values.
	 *
	 * @param {MetricListOptions?} opts
	 */
	list(opts = {}) {
		const res = [];

		const types =
			opts.types != null ? (isString(opts.types) ? [opts.types] : opts.types) : null;
		const includes =
			opts.includes != null
				? isString(opts.includes)
					? [opts.includes]
					: opts.includes
				: null;
		const excludes =
			opts.excludes != null
				? isString(opts.excludes)
					? [opts.excludes]
					: opts.excludes
				: null;

		this.store.forEach(metric => {
			if (types && !types.some(type => metric.type == type)) return;

			if (includes && !includes.some(pattern => match(metric.name, pattern))) return;

			if (excludes && !excludes.every(pattern => !match(metric.name, pattern))) return;

			res.push(metric.toObject());
		});

		return res;
	}

	/**
	 * Pluralize metric units.
	 *
	 * @param {String} unit
	 * @returns {String}
	 */
	pluralizeUnit(unit) {
		switch (unit) {
			case METRIC.UNIT_GHZ:
				return unit;
		}
		return unit + "s";
	}
}

module.exports = MetricRegistry;
