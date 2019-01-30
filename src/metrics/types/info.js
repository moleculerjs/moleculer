/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { pick } = require("lodash");
const BaseMetric = require("./base");
const METRIC = require("../constants");

class InfoMetric extends BaseMetric {

	constructor(opts) {
		opts.type = METRIC.TYPE_INFO;
		super(opts);
		this.initialValue = null;

		this.clear();
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

module.exports = InfoMetric;
