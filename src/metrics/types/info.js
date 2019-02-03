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

	constructor(opts, registry) {
		super(opts, registry);
		this.type = METRIC.TYPE_INFO;

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
		this.setDirty();

		return item;
	}

	reset(labels, timestamp) {
		return this.set(null, labels, timestamp);
	}

	resetAll(timestamp) {
		Object.keys(this.values).forEach(hash => {
			this.values[hash].value = null;
			this.values[hash].timestamp = timestamp == null ? Date.now() : timestamp;
		});
		this.setDirty();
	}

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

module.exports = InfoMetric;
