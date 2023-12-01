/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");
const os = require("os");
const { MoleculerError } = require("../../errors");
const METRIC = require("../constants");
const { isFunction } = require("../../utils");

const BASE_URL = "https://api.datadoghq.com/api/";

/**
 * Import types
 *
 * @typedef {import("../registry")} MetricRegistry
 * @typedef {import("./datadog").DatadogReporterOptions} DatadogReporterOptions
 * @typedef {import("./datadog")} DatadogReporterClass
 * @typedef {import("../types/base").BaseMetricPOJO} BaseMetricPOJO
 * @typedef {import("../types/base")} BaseMetric
 */

/**
 * Datadog reporter for Moleculer.
 *
 * 		https://www.datadoghq.com/
 *
 * @class DatadogReporter
 * @extends {BaseReporter}
 * @implements {DatadogReporterClass}
 */
class DatadogReporter extends BaseReporter {
	/**
	 * Constructor of DatadogReporters
	 * @param {DatadogReporterOptions} opts
	 * @memberof DatadogReporter
	 */
	constructor(opts) {
		super(opts);

		/** @type {DatadogReporterOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			host: os.hostname(),
			baseUrl: BASE_URL,
			apiVersion: "v1",
			path: "/series",
			apiKey: process.env.DATADOG_API_KEY,
			//appKey: process.env.DATADOG_APP_KEY,
			defaultLabels: registry => ({
				namespace: registry.broker.namespace,
				nodeID: registry.broker.nodeID
			}),
			interval: 10
		});

		if (!this.opts.apiKey)
			throw new MoleculerError(
				"Datadog API key is missing. Set DATADOG_API_KEY environment variable."
			);
	}

	/**
	 * Initialize reporter.
	 *
	 * @param {MetricRegistry} registry
	 * @memberof DatadogReporter
	 */
	init(registry) {
		super.init(registry);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval * 1000);
			this.timer.unref();
		}

		this.defaultLabels = isFunction(this.opts.defaultLabels)
			? this.opts.defaultLabels.call(this, registry)
			: this.opts.defaultLabels;
	}

	/**
	 * Stop reporter
	 *
	 * @memberof DatadogReporter
	 */
	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		return Promise.resolve();
	}

	/**
	 * Flush metric data to Datadog server
	 *
	 * @memberof DatadogReporter
	 */
	flush() {
		const series = this.generateDatadogSeries();

		if (series.length === 0) return;

		return fetch(
			`${this.opts.baseUrl}${this.opts.apiVersion}${this.opts.path}?api_key=${this.opts.apiKey}`,
			{
				method: "post",
				body: JSON.stringify({ series }),
				headers: {
					"Content-Type": "application/json"
				}
			}
		)
			.then(res => {
				this.logger.debug("Metrics are uploaded to DataDog. Status: ", res.statusText);
			})
			.catch(err => {
				/* istanbul ignore next */
				this.logger.warn(
					"Unable to upload metrics to Datadog server. Error:" + err.message,
					err
				);
			});
	}

	/**
	 * Generate Datadog metric data.
	 * @returns {Array<Object>}
	 *
	 * @memberof DatadogReporter
	 */
	generateDatadogSeries() {
		const series = [];

		const now = this.posixTimestamp(Date.now());

		this.registry.store.forEach(metric => {
			// Filtering
			if (!this.matchMetricName(metric.name)) return;
			// Skip datetime metrics (register too much labels)
			if (metric.name.startsWith("os.datetime")) return;

			/* More info: https://docs.datadoghq.com/api/?lang=bash#post-timeseries-points

				metric [required]:
					The name of the timeseries
				type [optional, default=gauge]:
					Type of your metric either: gauge, rate, or count
				interval [optional, default=None]:
					If the type of the metric is rate or count, define the corresponding interval.
				points [required]:
					A JSON array of points. Each point is of the form:
					[[POSIX_timestamp, numeric_value], ...]
					Note: The timestamp should be in seconds, current, and its format should be a 32bit float gauge-type value. Current is defined as not more than 10 minutes in the future or more than 1 hour in the past.
				host [optional]:
					The name of the host that produced the metric.
				tags [optional, default=None]:
					A list of tags associated with the metric.
			*/

			const snapshot = metric.snapshot();
			if (snapshot.length === 0) return;

			switch (metric.type) {
				case METRIC.TYPE_COUNTER:
				case METRIC.TYPE_GAUGE: {
					snapshot.forEach(item => {
						series.push({
							metric: this.formatMetricName(metric.name),
							type: "gauge",
							points: [[now, item.value]],
							tags: this.labelsToTags(item.labels),
							host: this.opts.host
						});
					});

					break;
				}
				/*case METRIC.TYPE_INFO: {
					series.push(`# HELP ${metricName} ${metricDesc}`);
					series.push(`# TYPE ${metricName} gauge`);
					snapshot.forEach(item => {
						const labelStr = this.labelsToStr(item.labels, { value: item.value });
						series.push(`${metricName}${labelStr} 1`);
					});
					series.push("");

					break;
				}*/
				case METRIC.TYPE_HISTOGRAM: {
					snapshot.forEach(item => {
						if (item.buckets) {
							Object.keys(item.buckets).forEach(le => {
								series.push({
									metric: this.formatMetricName(metric.name + ".bucket_" + le),
									type: "rate",
									points: [[now, item.buckets[le]]],
									tags: this.labelsToTags(item.labels),
									host: this.opts.host
								});
							});
							// +Inf
							series.push({
								metric: this.formatMetricName(metric.name + ".bucket_inf"),
								type: "rate",
								points: [[now, item.count]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});
						}

						if (item.quantiles) {
							Object.keys(item.quantiles).forEach(key => {
								series.push({
									metric: this.formatMetricName(metric.name + ".q" + key),
									type: "rate",
									points: [[now, item.quantiles[key]]],
									tags: this.labelsToTags(item.labels),
									host: this.opts.host
								});
							});

							// Add other calculated values
							series.push({
								metric: this.formatMetricName(metric.name + ".sum"),
								type: "rate",
								points: [[now, item.sum]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".count"),
								type: "rate",
								points: [[now, item.count]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".min"),
								type: "rate",
								points: [[now, item.min]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".mean"),
								type: "rate",
								points: [[now, item.mean]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".variance"),
								type: "rate",
								points: [[now, item.variance]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".stddev"),
								type: "rate",
								points: [[now, item.stdDev]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".max"),
								type: "rate",
								points: [[now, item.max]],
								tags: this.labelsToTags(item.labels),
								host: this.opts.host
							});
						}
					});
					break;
				}
			}
		});

		return series;
	}

	/**
	 * Escape label value characters.
	 * @param {String} str
	 * @returns {String}
	 * @memberof DatadogReporter
	 */
	escapeLabelValue(str) {
		if (typeof str == "string") return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		return str;
	}

	/**
	 * Convert labels to Prometheus label string
	 *
	 * @param {Object} itemLabels
	 * @returns {Array<String>}
	 *
	 * @memberof DatadogReporter
	 */
	labelsToTags(itemLabels) {
		const labels = Object.assign({}, this.defaultLabels || {}, itemLabels || {});
		const keys = Object.keys(labels);
		if (keys.length === 0) return [];

		return keys.map(
			key => `${this.formatLabelName(key)}:${this.escapeLabelValue(labels[key])}`
		);
	}

	/**
	 *
	 * @param {number?} time
	 * @returns
	 */
	posixTimestamp(time) {
		return time != null ? Math.floor(time / 1000) : undefined;
	}
}

module.exports = DatadogReporter;
