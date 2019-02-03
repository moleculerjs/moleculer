/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");
const http = require("http");
const { MoleculerError } = require("../../errors");
const METRIC = require("../constants");

/**
 * TODO:
 * 	- add gzip https://prometheus.io/docs/instrumenting/exposition_formats/#basic-info
 */

class PrometheusReporter extends BaseReporter {

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

	init(registry) {
		super.init(registry);

		this.server = http.createServer();
		this.server.on("request", this.handler.bind(this));
		this.server.listen(this.opts.port, err => {
			if (err)
				return this.registry.broker.fatal(new MoleculerError("Prometheus metric reporter listening error: " + err.message));

			this.registry.logger.info(`Prometheus metric reporter listening on http://0.0.0.0:${this.opts.port}${this.opts.path} address.`);
		});
		this.defaultLabels = _.isFunction(this.opts.defaultLabels) ? this.opts.defaultLabels.call(this, registry) : this.opts.defaultLabels;
	}

	/**
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 */
	handler(req, res) {
		if (req.url == this.opts.path) {
			res.writeHead(200, {
				"Content-Type": "text/plain; version=0.0.4; charset=utf-8"
			});

			return res.end(this.generatePrometheusResponse());
		}
		res.writeHead(404, http.STATUS_CODES[404]);
		res.end();
	}

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

	escapeLabelValue(str) {
		if (typeof str == "string")
			return str.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
		return str;
	}

	labelsToStr(itemLabels, extraLabels) {
		const labels = Object.assign({}, this.defaultLabels || {}, itemLabels || {}, extraLabels || {});
		const keys = Object.keys(labels);
		if (keys.length == 0)
			return "";

		return "{" + keys.map(key => `${this.formatLabelName(key)}="${this.escapeLabelValue(labels[key])}"`).join(",") + "}";
	}
}

module.exports = PrometheusReporter;
