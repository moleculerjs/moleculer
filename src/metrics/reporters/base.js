/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/* eslint-disable no-unused-vars */

const _ = require("lodash");
const { match, isString } = require("../../utils");

/**
 * Import types
 *
 * @typedef {import("../registry")} MetricRegistry
 * @typedef {import("./base").MetricReporterOptions} MetricReporterOptions
 * @typedef {import("./base")} MetricBaseReporterClass
 * @typedef {import("../types/base")} BaseMetric
 */

/**
 * Metric reporter base class.
 *
 * @class MetricBaseReporter
 * @implements {MetricBaseReporterClass}
 */
class MetricBaseReporter {
	/**
	 * Creates an instance of BaseReporter.
	 *
	 * @param {MetricReporterOptions?} opts
	 * @memberof MetricBaseReporter
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			includes: null,
			excludes: null,

			metricNamePrefix: null,
			metricNameSuffix: null,

			metricNameFormatter: null,
			labelNameFormatter: null
		});

		if (isString(this.opts.includes)) this.opts.includes = [this.opts.includes];
		if (isString(this.opts.excludes)) this.opts.excludes = [this.opts.excludes];
	}

	/**
	 * Initialize reporter
	 *
	 * @param {MetricRegistry} registry
	 * @memberof MetricBaseReporter
	 */
	init(registry) {
		this.registry = registry;
		this.broker = this.registry.broker;
		this.logger = this.registry.logger;
	}

	/**
	 * Stop reporter
	 *
	 * @memberof MetricBaseReporter
	 */
	stop() {
		return Promise.resolve();
	}

	/**
	 * Match the metric name. Check the `includes` & `excludes` patterns.
	 *
	 * @param {String} name
	 * @returns {boolean}
	 * @memberof MetricBaseReporter
	 */
	matchMetricName(name) {
		if (Array.isArray(this.opts.includes)) {
			if (!this.opts.includes.some(pattern => match(name, pattern))) return false;
		}

		if (Array.isArray(this.opts.excludes)) {
			if (!this.opts.excludes.every(pattern => !match(name, pattern))) return false;
		}

		return true;
	}

	/**
	 * Format metric name. Add prefix, suffix and call custom formatter.
	 *
	 * @param {String} name
	 * @returns {String}
	 * @memberof MetricBaseReporter
	 */
	formatMetricName(name) {
		name =
			(this.opts.metricNamePrefix ? this.opts.metricNamePrefix : "") +
			name +
			(this.opts.metricNameSuffix ? this.opts.metricNameSuffix : "");
		if (this.opts.metricNameFormatter) return this.opts.metricNameFormatter(name);
		return name;
	}

	/**
	 * Format label name. Call custom formatter.
	 *
	 * @param {String} name
	 * @returns {String}
	 * @memberof MetricBaseReporter
	 */
	formatLabelName(name) {
		if (this.opts.labelNameFormatter) return this.opts.labelNameFormatter(name);
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
	 * @memberof MetricBaseReporter
	 */
	metricChanged(metric, value, labels, timestamp) {
		// Not implemented. Abstract method
	}
}

module.exports = MetricBaseReporter;
