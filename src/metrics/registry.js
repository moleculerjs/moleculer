/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const chalk = require("chalk");
const Promise = require("bluebird");
const _ = require("lodash");
const METRIC = require("./constants");
const Types = require("./types");
const { registerCommonMetrics, updateCommonMetrics } = require("./commons");

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

		if (opts === true || opts === false)
			opts = { enabled: opts };

		this.opts = _.defaultsDeep({}, opts, {
			enabled: true,
			collectProcessMetrics: true,
			collectInterval: 5 * 1000,
		});

		this.store = new Map();

		if (this.opts.enabled)
			this.logger.info("Metrics: Enabled");
		else
			this.logger.info("Metrics: Disabled");
	}

	/**
	 * Start Metric Registry
	 */
	init() {
		if (this.opts.enabled) {
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

	register(opts) {
		if (!_.isPlainObject(opts))
			throw new Error("Wrong argument. Must be an Object.");

		if (!opts.type)
			throw new Error("The 'type' property is mandatory");

		if (!opts.name)
			throw new Error("The 'name' property is mandatory");

		const MetricClass = Types.getByType(opts.type);
		if (!MetricClass)
			throw new Error(`Invalid '${opts.type}' metric type`);

		if (!this.opts.enabled)
			return null;

		const item = new MetricClass(opts);
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

	decrement(name, labels, value = -1, timestamp) {
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

	debugPrint() {
		const labelsToStr = labels => {
			const keys = Object.keys(labels);
			if (keys.length == 0)
				return chalk.gray("{}");

			return chalk.gray("{") + keys.map(key => `${chalk.gray(key)}: ${chalk.magenta(labels[key])}`).join(", ") + chalk.gray("}");
		};
		/* eslint-disable no-console */
		const log = console.log;

		log(chalk.gray("------------------- [ METRICS START ] -------------------"));

		this.store.forEach(item => {
			log("Name: " + chalk.cyan.bold(item.name) + " " + chalk.gray("(" + item.type + ")"));
			const values = item.values;
			values.forEach(valueItem => {
				let val;
				switch(item.type) {
					case METRIC.TYPE_COUNTER:
					case METRIC.TYPE_GAUGE:
					case METRIC.TYPE_INFO:
						val = chalk.green.bold(valueItem.value);
						break;
					case METRIC.TYPE_HISTOGRAM:
						val = chalk.green.bold(item.toString());
						break;
				}
				log(`      ${labelsToStr(valueItem.labels)}: ${val} ${item.unit ? chalk.gray(item.unit) : ""}`);
			});
			log("");
		});


		log(chalk.gray("-------------------- [ METRICS END ] --------------------"));
	}
}

module.exports = MetricRegistry;
