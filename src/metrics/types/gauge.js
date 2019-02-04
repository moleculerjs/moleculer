/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { pick } = require("lodash");
const BaseMetric = require("./base");
const METRIC = require("../constants");

/*
	TODO:
		- add EWMA rate
			https://github.com/dropwizard/metrics/blob/4.1-development/metrics-core/src/main/java/com/codahale/metrics/EWMA.java
			seconds based
			rates: [1, 30, 60, 300] seconds like quantiles
*/

/**
 * Gauge metric class.
 *
 * @class GaugeMetric
 * @extends {BaseMetric}
 */
class GaugeMetric extends BaseMetric {

	/**
	 * Creates an instance of GaugeMetric.
	 * @param {Object} opts
	 * @param {MetricRegistry} registry
	 * @memberof GaugeMetric
	 */
	constructor(opts, registry) {
		super(opts, registry);
		this.type = METRIC.TYPE_GAUGE;

		this.clear();
	}

	/**
	 * Increment value
	 *
	 * @param {Object} labels
	 * @param {Number?} value
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof GaugeMetric
	 */
	increment(labels, value, timestamp) {
		if (value == null)
			value = 1;

		const item = this.get(labels);
		return this.set((item ? item.value : 0) + value, labels, timestamp);
	}

	/**
	 * Decrement value.
	 *
	 * @param {Object} labels
	 * @param {Number?} value
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof GaugeMetric
	 */
	decrement(labels, value, timestamp) {
		if (value == null)
			value = 1;

		const item = this.get(labels);
		return this.set((item ? item.value : 0) - value, labels, timestamp);
	}

	/**
	 * Set value.
	 *
	 * @param {Number?} value
	 * @param {Object} labels
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof GaugeMetric
	 */
	set(value, labels, timestamp) {
		const hash = this.hashingLabels(labels);
		let item = this.values.get(hash);
		if (item) {
			item.value = value;
			item.timestamp = timestamp == null ? Date.now() : timestamp;
		} else {
			item = {
				value,
				labels: pick(labels, this.labelNames),
				timestamp: timestamp == null ? Date.now() : timestamp
			};
			this.values.set(hash, item);
		}
		this.changed(labels);

		return item;
	}

	/**
	 * Reset item by labels.
	 *
	 * @param {Object} labels
	 * @param {Number?} timestamp
	 * @returns
	 * @memberof GaugeMetric
	 */
	reset(labels, timestamp) {
		return this.set(0, labels, timestamp);
	}

	/**
	 * Reset all items.
	 *
	 * @param {Number?} timestamp
	 * @memberof GaugeMetric
	 */
	resetAll(timestamp) {
		this.values.forEach(item => {
			item.value = 0;
			item.timestamp = timestamp == null ? Date.now() : timestamp;
		});
		this.changed();
	}

	/**
	 * Generate a snapshot.
	 *
	 * @returns {Array<Object>}
	 * @memberof GaugeMetric
	 */
	generateSnapshot() {
		const snapshot = Array.from(this.values.values()).map(item => {
			return {
				value: item.value,
				labels: item.labels,
				timestamp: item.timestamp
			};
		});

		return snapshot;
	}
}

module.exports = GaugeMetric;
