/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { BaseMetric } = require("../");

class GaugeMetric extends BaseMetric {

	increment(labels, value, timestamp) {
		if (value == null)
			value = 1;

	}

	decrement(labels, value, timestamp) {
		if (value == null)
			value = 1;

	}
}

module.exports = GaugeMetric;
