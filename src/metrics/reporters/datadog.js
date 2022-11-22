/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");
const os = require("os");
const fetch = require("node-fetch");
const { MoleculerError } = require("../../errors");
const METRIC = require("../constants");
const { isFunction } = require("../../utils");

const BASE_URL = "https://api.datadoghq.com/api/";

/**
 * Datadog reporter for Moleculer.
 *
 * 		https://www.datadoghq.com/
 *
 */
class DatadogReporter extends BaseReporter {
	/**
	 * Constructor of DatadogReporters
	 * @param {Object} opts
	 * @memberof DatadogReporter
	 */
	constructor(opts) {
		super(opts);

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

		fetch.Promise = this.broker.Promise;

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

		if (series.length == 0) return;

		return fetch(`${this.opts.baseUrl}${this.opts.apiVersion}${this.opts.path}`, {
			method: "post",
			body: JSON.stringify({ series }),
			headers: {
				"Content-Type": "application/json",
				"DD-API-KEY": this.opts.apiKey
			}
		})
			.then(res => {
				this.logger.debug("Metrics are uploaded to DataDog. Status: ", res.statusText);
				if (res.statusText === "Bad Request") {
					this.logger.debug(`Request: ${JSON.stringify({ series })}`);
				}
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

			/* More info: https://docs.datadoghq.com/api/latest/metrics/#submit-metrics */

			const snapshot = metric.snapshot();
			if (snapshot.length == 0) return;

			switch (metric.type) {
				case METRIC.TYPE_COUNTER:
					snapshot.forEach(item => {
						series.push({
							metric: this.formatMetricName(metric.name),
							type: 1,
							points: [{ timestamp: now, value: item.value }],
							tags: this.labelsToTags(item.labels),
							resources: [{ name: this.opts.host, type: "host" }]
						});
					});

					break;
				case METRIC.TYPE_GAUGE: {
					snapshot.forEach(item => {
						series.push({
							metric: this.formatMetricName(metric.name),
							type: 3,
							points: [{ timestamp: now, value: item.value }],
							tags: this.labelsToTags(item.labels),
							resources: [{ name: this.opts.host, type: "host" }]
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
									type: 2,
									points: [{ timestamp: now, value: item.buckets[le] }],
									tags: this.labelsToTags(item.labels),
									resources: [{ name: this.opts.host, type: "host" }]
								});
							});
							// +Inf
							series.push({
								metric: this.formatMetricName(metric.name + ".bucket_inf"),
								type: 2,
								points: [{ timestamp: now, value: item.count }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});
						}

						if (item.quantiles) {
							Object.keys(item.quantiles).forEach(key => {
								series.push({
									metric: this.formatMetricName(metric.name + ".q" + key),
									type: 2,
									points: [{ timestamp: now, value: item.quantiles[key] }],
									tags: this.labelsToTags(item.labels),
									resources: [{ name: this.opts.host, type: "host" }]
								});
							});

							// Add other calculated values
							series.push({
								metric: this.formatMetricName(metric.name + ".sum"),
								type: 2,
								points: [{ timestamp: now, value: item.sum }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".count"),
								type: 2,
								points: [{ timestamp: now, value: item.count }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".min"),
								type: 2,
								points: [{ timestamp: now, value: item.min }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".mean"),
								type: 2,
								points: [{ timestamp: now, value: item.mean }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".variance"),
								type: 2,
								points: [{ timestamp: now, value: item.variance }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".stddev"),
								type: 2,
								points: [{ timestamp: now, value: item.stdDev }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
							});

							series.push({
								metric: this.formatMetricName(metric.name + ".max"),
								type: 2,
								points: [{ timestamp: now, value: item.max }],
								tags: this.labelsToTags(item.labels),
								resources: [{ name: this.opts.host, type: "host" }]
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
		if (keys.length == 0) return [];

		return keys.map(
			key => `${this.formatLabelName(key)}:${this.escapeLabelValue(labels[key])}`
		);
	}

	posixTimestamp(time) {
		return time != null ? Math.floor(time / 1000) : undefined;
	}
}

module.exports = DatadogReporter;
