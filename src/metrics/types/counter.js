/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { BaseMetric } = require("../");

class CounterMetric extends BaseMetric {

	increment(labels, value, timestamp) {
		if (value == null)
			value = 1;

		if (value < 0)
			throw new Error("Counter can't be decreased");

	}

}

module.exports = CounterMetric;
