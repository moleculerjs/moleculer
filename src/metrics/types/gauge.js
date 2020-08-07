/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { pick } = require("lodash");
const BaseMetric = require("./base");
const METRIC = require("../constants");
const MetricRate = require("../rates");

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
		this.rate = opts.rate;
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
			if (item.value != value) {
				item.value = value;
				item.timestamp = timestamp == null ? Date.now() : timestamp;

				if (item.rate)
					item.rate.update(value);

				this.changed(value, labels, timestamp);
			}
		} else {
			item = {
				value,
				labels: pick(labels, this.labelNames),
				timestamp: timestamp == null ? Date.now() : timestamp,
			};
			this.values.set(hash, item);

			if (this.rate) {
				item.rate = new MetricRate(this, item, 1);
				item.rate.update(value);
			}

			this.changed(value, labels, timestamp);
		}

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
		this.changed(null, null, timestamp);
	}

	/**
	 * Generate a snapshot.
	 *
	 * @returns {Array<Object>}
	 * @memberof GaugeMetric
	 */
	generateSnapshot() {
		const snapshot = Array.from(this.values.keys()).map(key => {
			const item = this.values.get(key);
			const res = {
				key,
				value: item.value,
				labels: item.labels,
				timestamp: item.timestamp
			};

			if (item.rate)
				res.rate = item.rate.rate;

			return res;
		});

		return snapshot;
	}
}

module.exports = GaugeMetric;
