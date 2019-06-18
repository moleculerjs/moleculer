/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { match } = require("../../utils");

/**
 * Metric reporter base class.
 *
 * @class BaseReporter
 */
class BaseReporter {

	/**
	 * Creates an instance of BaseReporter.
	 *
	 * @param {Object} opts
	 * @memberof BaseReporter
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			includes: null,
			excludes: null,

			metricNamePrefix: null,
			metricNameSuffix: null,

			metricNameFormatter: null,
			labelNameFormatter: null,
		});

		if (_.isString(this.opts.includes))
			this.opts.includes = [this.opts.includes];

		if (_.isString(this.opts.excludes))
			this.opts.excludes = [this.opts.excludes];
	}

	/**
	 * Initialize reporter
	 *
	 * @param {MetricRegistry} registry
	 * @memberof BaseReporter
	 */
	init(registry) {
		this.registry = registry;
		this.broker = this.registry.broker;
		this.logger = this.registry.logger;
	}

	/**
	 * Match the metric name. Check the `includes` & `excludes` patterns.
	 *
	 * @param {String} name
	 * @returns {boolean}
	 * @memberof BaseReporter
	 */
	matchMetricName(name) {
		if (Array.isArray(this.opts.includes)) {
			if (!this.opts.includes.some(pattern => match(name, pattern)))
				return false;
		}

		if (Array.isArray(this.opts.excludes)) {
			if (!this.opts.excludes.every(pattern => !match(name, pattern)))
				return false;
		}

		return true;
	}

	/**
	 * Format metric name. Add prefix, suffix and call custom formatter.
	 *
	 * @param {String} name
	 * @returns {String}
	 * @memberof BaseReporter
	 */
	formatMetricName(name) {
		name = (this.opts.metricNamePrefix ? this.opts.metricNamePrefix : "") + name + (this.opts.metricNameSuffix ? this.opts.metricNameSuffix : "");
		if (this.opts.metricNameFormatter)
			return this.opts.metricNameFormatter(name);
		return name;
	}

	/**
	 * Format label name. Call custom formatter.
	 *
	 * @param {String} name
	 * @returns {String}
	 * @memberof BaseReporter
	 */
	formatLabelName(name) {
		if (this.opts.labelNameFormatter)
			return this.opts.labelNameFormatter(name);
		return name;
	}

	/**
	 * Some metric has been changed.
	 *
	 * @param {BaseMetric} metric
	 * @param {any} value
	 * @param {Object} labels
	 * @param {Number?} timestamp
	 *
	 * @memberof BaseReporter
	 */
	metricChanged(/*metric, value, labels, timestamp*/) {
		// Not implemented. Abstract method
	}
}

module.exports = BaseReporter;
