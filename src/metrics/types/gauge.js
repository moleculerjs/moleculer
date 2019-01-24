/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseMetric = require("./base");
const { METRIC_TYPE_GAUGE } = require("../constants");

class GaugeMetric extends BaseMetric {

	constructor(opts) {
		super(METRIC_TYPE_GAUGE, opts);

		this.resetAll();
	}

	increment(labels, value, timestamp) {
		if (value == null)
			value = 1;

		return this.set(this.get(labels) + value, labels, timestamp);
	}

	decrement(labels, value, timestamp) {
		if (value == null)
			value = 1;

		return this.set(this.get(labels) - value, labels, timestamp);
	}
}

module.exports = GaugeMetric;
