/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

const METRIC_TYPE_COUNTER = "counter";
const METRIC_TYPE_GAUGE = "gauge";
const METRIC_TYPE_HISTROGRAM = "histogram";

/**
 * Metric Registry class
 */
class MetricRegistry {

	/**
	 * Constructor of MetricRegistry
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep({}, opts, {
			processInterval: 1 * 1000,
			notifyInterval: 5 * 1000
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

		this.processTimer = setInterval(() => {

		}, this.opts.processInterval);

		this.notifyTimer = setInterval(() => {

		}, this.opts.notifyInterval);
	}

	/**
	 * Stop Metric Registry
	 */
	stop() {
		clearInterval(this.processTimer);
		clearInterval(this.notifyTimer);
	}

	/**
	 *
	 * @param {*} name
	 * @param {*} type
	 * @param {Array<String>?} opts.labels
	 * @param {String?} opts.description
	 */
	register(name, type, opts) {

	}

	/**
	 *
	 * @param {*} name
	 * @param {*} value
	 */
	increment(name, value = 1) {

	}

	/**
	 *
	 * @param {*} name
	 * @param {*} value
	 */
	decrement(name, value = 1) {

	}

	/**
	 *
	 * @param {*} name
	 * @param {*} value
	 */
	set(name, value) {

	}

	/**
	 * Reset a gauge metric
	 * @param {*} name
	 */
	reset(name) {

	}

	get(name) {

	}

	/**
	 * Measure the elapsed time
	 *
	 * @param {*} name
	 */
	timer(name) {
		const start = process.hrtime();

		return () => {
			const diff = process.hrtime(start);
			const duration = (diff[0] + diff[1] / 1e9) * 1000;

			// TODO
		};
	}
}

class MetricSet {

	constructor(name, initialValue) {
		this.name = name;
		this.value = initialValue;
		this.labels = [];
	}

}

class CounterMetricSet extends MetricSet {}
class GaugeMetricSet extends MetricSet {}
class HistogramMetricSet extends MetricSet {}

// --- EXPORTS ---

MetricRegistry.MetricSet = MetricSet;
MetricRegistry.CounterMetricSet = CounterMetricSet;
MetricRegistry.GaugeMetricSet = GaugeMetricSet;
MetricRegistry.HistogramMetricSet = HistogramMetricSet;

module.exports = MetricRegistry;

