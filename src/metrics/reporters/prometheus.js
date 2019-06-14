/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");
const http = require("http");
const zlib = require("zlib");
const { MoleculerError } = require("../../errors");
const METRIC = require("../constants");

/**
 * Prometheus reporter for Moleculer.
 *
 * 		https://prometheus.io/
 *
 * Running Prometheus & Grafana in Docker:
 *
 * 		git clone https://github.com/vegasbrianc/prometheus.git
 * 		cd prometheus
 *
 * 	Please note, don't forget add your endpoint to static targets in prometheus/prometheus.yml file.
 *  The default port is 3030.
 *
 *     static_configs:
 *       - targets: ['localhost:9090', 'moleculer-hostname:3030']
 *
 *  Start containers:
 *
 * 		docker-compose up -d
 *
 * Grafana dashboard: http://<docker-ip>:3000
 *
 */
class PrometheusReporter extends BaseReporter {

	/**
	 * Constructor of PrometheusReporters
	 * @param {Object} opts
	 * @memberof PrometheusReporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			port: 3030,
			path: "/metrics",
			defaultLabels: (registry) => ({
				namespace: registry.broker.namespace,
				nodeID: registry.broker.nodeID
			})
		});
	}

	/**
	 * Initialize reporter
	 * @param {MetricRegistry} registry
	 * @memberof PrometheusReporter
	 */
	init(registry) {
		super.init(registry);

		this.server = http.createServer();
		this.server.on("request", this.handler.bind(this));
		this.server.listen(this.opts.port, err => {
			if (err) {
				/* istanbul ignore next */
				return this.registry.broker.fatal(new MoleculerError("Prometheus metric reporter listening error: " + err.message));
			}

			this.logger.info(`Prometheus metric reporter listening on http://0.0.0.0:${this.opts.port}${this.opts.path} address.`);
		});
		this.defaultLabels = _.isFunction(this.opts.defaultLabels) ? this.opts.defaultLabels.call(this, registry) : this.opts.defaultLabels;
	}

	/**
	 * HTTP request handler. Support GZip compressing.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @memberof PrometheusReporter
	 */
	handler(req, res) {
		if (req.url == this.opts.path) {
			const resHeader = {
				"Content-Type": "text/plain; version=0.0.4; charset=utf-8"
			};

			const content = this.generatePrometheusResponse();
			const compressing = req.headers["accept-encoding"] && req.headers["accept-encoding"].includes("gzip");
			if (compressing) {
				resHeader["Content-Encoding"] = "gzip";
				zlib.gzip(content, (err, buffer) => {
					/* istanbul ignore next */
					if (err) {
						this.logger("Unable to compress response: " + err.message);
						res.writeHead(500);
						res.end(err.message);
					} else {
						res.writeHead(200, resHeader);
						res.end(buffer);
					}
				});
			} else {
				res.writeHead(200, resHeader);
				res.end(content);
			}
		} else {
			res.writeHead(404, http.STATUS_CODES[404], {});
			res.end();
		}
	}

	/**
	 * Generate Prometheus response.
	 * @returns {String}
	 * @memberof PrometheusReporter
	 */
	generatePrometheusResponse() {
		const content = [];

		const val = value => value == null ? "NaN" : value;

		this.registry.store.forEach(metric => {
			// Filtering
			if (!this.matchMetricName(metric.name)) return;
			// Skip datetime metrics (register too much labels)
			if (metric.name.startsWith("os.datetime")) return;

			const metricName = this.formatMetricName(metric.name).replace(/[.-]/g, "_");
			const metricDesc = metric.description ? metric.description : (metric.name + (metric.unit ? ` (${metric.unit})` : ""));
			const metricType = metric.type;

			const snapshot = metric.snapshot();
			if (snapshot.length == 0)
				return;

			switch(metric.type) {
				case METRIC.TYPE_COUNTER:
				case METRIC.TYPE_GAUGE: {
					content.push(`# HELP ${metricName} ${metricDesc}`);
					content.push(`# TYPE ${metricName} ${metricType}`);
					snapshot.forEach(item => {
						const labelStr = this.labelsToStr(item.labels);
						content.push(`${metricName}${labelStr} ${val(item.value)}`);
					});
					content.push("");

					break;
				}
				case METRIC.TYPE_INFO: {
					content.push(`# HELP ${metricName} ${metricDesc}`);
					content.push(`# TYPE ${metricName} gauge`);
					snapshot.forEach(item => {
						const labelStr = this.labelsToStr(item.labels, { value: item.value });
						content.push(`${metricName}${labelStr} 1`);
					});
					content.push("");

					break;
				}
				case METRIC.TYPE_HISTOGRAM: {
					content.push(`# HELP ${metricName} ${metricDesc}`);
					content.push(`# TYPE ${metricName} ${metricType}`);
					snapshot.forEach(item => {

						if (item.buckets) {
							Object.keys(item.buckets).forEach(le => {
								const labelStr = this.labelsToStr(item.labels, { le });
								content.push(`${metricName}_bucket${labelStr} ${val(item.buckets[le])}`);
							});
							// +Inf
							const labelStr = this.labelsToStr(item.labels, { le: "+Inf" });
							content.push(`${metricName}_bucket${labelStr} ${val(item.count)}`);
						}

						if (item.quantiles) {

							Object.keys(item.quantiles).forEach(key => {
								const labelStr = this.labelsToStr(item.labels, { quantile: key });
								content.push(`${metricName}${labelStr} ${val(item.quantiles[key])}`);
							});

							// Add other calculated values
							const labelStr = this.labelsToStr(item.labels);
							content.push(`${metricName}_sum${labelStr} ${val(item.sum)}`);
							content.push(`${metricName}_count${labelStr} ${val(item.count)}`);
							content.push(`${metricName}_min${labelStr} ${val(item.min)}`);
							content.push(`${metricName}_mean${labelStr} ${val(item.mean)}`);
							content.push(`${metricName}_variance${labelStr} ${val(item.variance)}`);
							content.push(`${metricName}_stddev${labelStr} ${val(item.stdDev)}`);
							content.push(`${metricName}_max${labelStr} ${val(item.max)}`);
						}
					});
					content.push("");
					break;
				}
			}
		});

		return content.join("\n");
	}

	/**
	 * Escape label value characters.
	 * @param {String} str
	 * @returns {String}
	 * @memberof PrometheusReporter
	 */
	escapeLabelValue(str) {
		if (typeof str == "string")
			return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
		return str;
	}

	/**
	 * Convert labels to Prometheus label string
	 *
	 * @param {Object} itemLabels
	 * @param {Object?} extraLabels
	 * @returns {String}
	 * @memberof PrometheusReporter
	 */
	labelsToStr(itemLabels, extraLabels) {
		const labels = Object.assign({}, this.defaultLabels || {}, itemLabels || {}, extraLabels || {});
		const keys = Object.keys(labels);
		if (keys.length == 0)
			return "";

		return "{" + keys.map(key => `${this.formatLabelName(key)}="${this.escapeLabelValue(labels[key])}"`).join(",") + "}";
	}

}

module.exports = PrometheusReporter;
