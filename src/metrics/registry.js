/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");
const C = require("./constants");
const Types = require("./types");

/**
 * Metric Registry class
 */
class MetricRegistry {

	/**
	 * Constructor of MetricRegistry
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep({}, opts, {
			enabled: true,
			collectProcessMetrics: true,
			processInterval: 1 * 1000,
			//notifyInterval: 5 * 1000
		});

		this.store = new Map();
	}

	/**
	 * Start Metric Registry
	 *
	 * @param {ServiceBroker} broker
	 */
	start(broker) {
		this.broker = broker;

		if (this.opts.enabled) {
			this.processTimer = setInterval(() => {

			}, this.opts.processInterval);

			/*this.notifyTimer = setInterval(() => {

			}, this.opts.notifyInterval);*/

			this.registerProcessMetrics();
		}
	}

	/**
	 * Stop Metric Registry
	 */
	stop() {
		clearInterval(this.processTimer);
		clearInterval(this.notifyTimer);
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

	resetAll() {
		this.store = new Map();
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

	incValue(name, labels, value = 1, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		if (!_.isFunction(item.increment))
			throw new Error("Invalid metric type. Incrementing works only with counters & gauges");

		return item.increment(labels, value, timestamp);
	}

	decValue(name, labels, value = -1, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		if (!_.isFunction(item.decrement))
			throw new Error("Invalid metric type. Decrementing works only with gauges");

		return item.decrement(labels, value, timestamp);
	}

	setValue(name, value, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		return item.set(value, labels, timestamp);
	}

	observe(name, value, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		if (!_.isFunction(item.observe))
			throw new Error("Invalid metric type. Observing works only with histogram");

		return item.observe(value, labels, timestamp);
	}

	getValue(name, labels) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		return item.get(labels);
	}

	resetValue(name, labels, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		item.reset(labels, timestamp);
	}

	resetMetric(name, timestamp) {
		if (!this.opts.enabled)
			return null;

		const item = this.getMetric(name);
		if (!item)
			throw new Error(`Metric '${name}' is not exist.`);

		item.resetAll(timestamp);
	}

	timer(name, labels, timestamp) {
		let item;
		if (name && this.opts.enabled) {
			item = this.getMetric(name);
			if (!item)
				throw new Error(`Metric '${name}' is not exist.`);

			if (!_.isFunction(item.add))
				throw new Error("Invalid metric type. Timing works only with histograms");
		}

		const start = process.hrtime();
		return () => {
			const delta = process.hrtime(start);
			const duration = (delta[0] + delta[1] / 1e9) * 1000;

			if (item) {
				if (item.type == C.METRIC_TYPE_HISTROGRAM)
					item.observe(duration, labels, timestamp);
				else if (item.type == C.METRIC_TYPE_GAUGE)
					item.set(duration, labels, timestamp);
			}

			return duration;
		};
	}

	registerProcessMetrics() {
		// TODO
	}
}

module.exports = MetricRegistry;
