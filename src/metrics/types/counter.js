/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseMetric = require("./base");
const { METRIC_TYPE_COUNTER } = require("../constants");

class CounterMetric extends BaseMetric {

	constructor(opts) {
		super(METRIC_TYPE_COUNTER, opts);

		this.resetAll();
	}

	increment(labels, value, timestamp) {
		if (value == null)
			value = 1;

		if (value < 0)
			throw new Error("Counter can't be decreased");

		return this.set(this.get(labels) + value, labels, timestamp);
	}

}

module.exports = CounterMetric;
