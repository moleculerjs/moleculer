/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const GaugeMetric = require("./gauge");
const METRIC = require("../constants");

/**
 * Import types
 *
 * @typedef {import("../registry")} MetricRegistry
 * @typedef {import("./counter")} CounterMetricClass
 * @typedef {import("./base").BaseMetricOptions} BaseMetricOptions
 */

/**
 * Counter metric class.
 *
 * @class CounterMetric
 * @extends {GaugeMetric}
 * @implements {CounterMetricClass}
 */
class CounterMetric extends GaugeMetric {
	/**
	 * Creates an instance of CounterMetric.
	 * @param {BaseMetricOptions} opts
	 * @param {MetricRegistry} registry
	 * @memberof CounterMetric
	 */
	constructor(opts, registry) {
		super(opts, registry);
		this.type = METRIC.TYPE_COUNTER;
	}

	/**
	 * Disabled decrement method.
	 *
	 * @memberof CounterMetric
	 */
	decrement() {
		throw new Error("Counter can't be decreased.");
	}
}

module.exports = CounterMetric;
