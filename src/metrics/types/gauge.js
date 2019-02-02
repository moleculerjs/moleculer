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

class GaugeMetric extends BaseMetric {

	constructor(opts, registry) {
		opts.type = METRIC.TYPE_GAUGE;
		super(opts, registry);
		this.initialValue = opts.initialValue || 0;

		this.clear();
	}

	increment(labels, value, timestamp) {
		if (value == null)
			value = 1;

		const item = this.get(labels);
		return this.set((item ? item.value : 0) + value, labels, timestamp);
	}

	decrement(labels, value, timestamp) {
		if (value == null)
			value = 1;

		const item = this.get(labels);
		return this.set((item ? item.value : 0) - value, labels, timestamp);
	}

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

		return item;
	}

	reset(labels, timestamp) {
		return this.set(this.initialValue, labels, timestamp);
	}

	resetAll(timestamp) {
		Object.keys(this.values).forEach(hash => {
			this.values[hash].value = this.initialValue;
			this.values[hash].timestamp = timestamp == null ? Date.now() : timestamp;
		});
	}
}

module.exports = GaugeMetric;
