/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const GaugeMetric = require("./gauge");
const METRIC = require("../constants");

/**
 * Counter metric class.
 *
 * @class CounterMetric
 * @extends {GaugeMetric}
 */
class CounterMetric extends GaugeMetric {

	/**
	 * Creates an instance of CounterMetric.
	 * @param {Object} opts
	 * @param {MetricRegistry} registry
	 * @memberof CounterMetric
	 */
	constructor(opts, registry) {
		super(opts, registry);
		this.type = METRIC.TYPE_COUNTER;

		this.clear();
	}

	/**
	 * Disabled decrement method.
	 *
	 * @memberof CounterMetric
	 */
	decrement() {
		throw new Error("Counter can't be decreased");
	}
}

module.exports = CounterMetric;
