/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");
const METRIC = require("./constants");
const Types = require("./types");
const Reporters = require("./reporters");
const { registerCommonMetrics, updateCommonMetrics } = require("./commons");

const METRIC_NAME_REGEXP 	= /^[a-zA-Z_][a-zA-Z0-9-_:.]*$/;
const METRIC_LABEL_REGEXP 	= /^[a-zA-Z_][a-zA-Z0-9-_.]*$/;

/**
 * Metric Registry class
 */
class MetricRegistry {

	/**
	 * Constructor of MetricRegistry
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("metrics");

		this.dirty = true;

		if (opts === true || opts === false)
			opts = { enabled: opts };

		this.opts = _.defaults({}, opts, {
			enabled: true,
			collectProcessMetrics: true,
			collectInterval: 5 * 1000,

			reporter: false,

			defaultBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
			defaultQuantiles: [0.5, 0.9, 0.95, 0.99, 0.999],
			defaultMaxAgeSeconds: 60,
			defaultAgeBuckets: 10,
			defaultAggregator: "sum"
		});

		this.store = new Map();

		if (this.opts.enabled)
			this.logger.info("Metrics: Enabled");
		else
			this.logger.info("Metrics: Disabled");
	}

	setDirty() {
		this.dirty = true;
	}

	clearDirty() {
		this.dirty = false;
	}

	/**
	 * Start Metric Registry
	 */
	init() {
		if (this.opts.enabled) {

			// Create Reporter instances
			if (this.opts.reporter) {
				const reporters = Array.isArray(this.opts.reporter) ? this.opts.reporter : [this.opts.reporter];

				this.reporter = reporters.map(r => {
					const reporter = Reporters.resolve(r);
					reporter.init(this);
					return reporter;
				});
			}

			// Start colllect timer
			if (this.opts.collectProcessMetrics) {
				this.collectTimer = setInterval(() => {
					updateCommonMetrics.call(this);
				}, this.opts.collectInterval);
				this.collectTimer.unref();

				registerCommonMetrics.call(this);
				updateCommonMetrics.call(this);
			}
		}
	}

	/**
	 * Stop Metric Registry
	 *
	 * TODO: need to call?
	 */
	stop() {
		if (this.collectTimer)
			clearInterval(this.collectTimer);
	}

	isEnabled() {
		return this.opts.enabled;
	}

	register(opts) {
		if (!_.isPlainObject(opts))
			throw new Error("Wrong argument. Must be an Object.");

		if (!opts.type)
			throw new Error("The metric 'type' property is mandatory");

		if (!opts.name)
			throw new Error("The metric 'name' property is mandatory");

		if (!METRIC_NAME_REGEXP.test(opts.name))
			throw new Error("The metric 'name' is not valid: " + opts.name);

		if (Array.isArray(opts.labelNames)) {
			opts.labelNames.forEach(name => {
				if (!METRIC_LABEL_REGEXP.test(name))
					throw new Error(`The '${opts.name}' metric label name is not valid: ${name}`);

			});
		}

		const MetricClass = Types.resolve(opts.type);

		if (!this.opts.enabled)
			return null;

		const item = new MetricClass(opts, this);
		this.store.set(opts.name, item);
		return item;
	}

	hasMetric(name) {
		return this.store.has(name);
	}

	getMetric(name) {
		if (!this.opts.enabled)
			return null;

		const item = this.store.get(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		return item;
	}

	increment(name, labels, value = 1, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.increment))
			throw new Error("Invalid metric type. Incrementing works only with counter & gauge metric types");

		return item.increment(labels, value, timestamp);
	}

	decrement(name, labels, value = 1, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.decrement))
			throw new Error("Invalid metric type. Decrementing works only with gauge metric type");

		return item.decrement(labels, value, timestamp);
	}

	set(name, value, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.set))
			throw new Error("Invalid metric type. Value setting works only with counter, gauge & info metric types");

		return item.set(value, labels, timestamp);
	}

	observe(name, value, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!_.isFunction(item.observe))
			throw new Error("Invalid metric type. Observing works only with histogram metric type.");

		return item.observe(value, labels, timestamp);
	}

	get(name, labels) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		return item.get(labels);
	}

	reset(name, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		item.reset(labels, timestamp);
	}

	resetAll(name, timestamp) {
		if (!this.opts.enabled)
			return null;

		if (!name) {
			this.store.clear();
		}

		const item = this.getMetric(name);
		item.resetAll(timestamp);
	}

	timer(name, labels, timestamp) {
		let item;
		if (name && this.opts.enabled) {
			item = this.getMetric(name);
			if (!_.isFunction(item.observe) && !_.isFunction(item.set))
				throw new Error("Invalid metric type. Timing works only with histogram or gauge metric types");
		}

		const start = process.hrtime();
		return () => {
			const delta = process.hrtime(start);
			const duration = (delta[0] + delta[1] / 1e9) * 1000;

			if (item) {
				if (item.type == METRIC.TYPE_HISTOGRAM)
					item.observe(duration, labels, timestamp);
				else if (item.type == METRIC.TYPE_GAUGE)
					item.set(duration, labels, timestamp);
			}

			return duration;
		};
	}
}

module.exports = MetricRegistry;
