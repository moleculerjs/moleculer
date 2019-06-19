/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const { makeDirs } = require("../../utils");
const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const METRIC = require("../constants");


const MODE_METRIC = "metric";
const MODE_LABEL = "label";
/**
 * Event reporter for Moleculer Metrics
 *
 * @class CSVReporter
 * @extends {BaseReporter}
 */
class CSVReporter extends BaseReporter {

	/**
	 * Creates an instance of CSVReporter.
	 * @param {Object} opts
	 * @memberof CSVReporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			folder: "./reports/metrics",
			delimiter: ",",
			rowDelimiter: "\n",

			mode: MODE_METRIC, // MODE_METRIC, MODE_LABEL

			types: null,

			interval: 5 * 1000,

			filenameFormatter: null,
			rowFormatter: null,
		});

		this.lastChanges = new Set();
	}

	/**
	 * Initialize reporter.
	 *
	 * @param {MetricRegistry} registry
	 * @memberof CSVReporter
	 */
	init(registry) {
		super.init(registry);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval);
			this.timer.unref();
		}

		this.folder = path.resolve(this.opts.folder);
		makeDirs(this.folder);
	}

	/**
	 * Convert labels to label string
	 *
	 * @param {Object} labels
	 * @returns {String}
	 * @memberof CSVReporter
	 */
	labelsToStr(labels) {
		if (labels == null) return "";

		const keys = Object.keys(labels);
		if (keys.length == 0) return "";

		return keys.map(key => `${this.formatLabelName(key)}=${labels[key]}`)
			.join("--")
			.replace(/[\s]/g, "_")
			.replace(/[|&:;$%@"<>()+,/?]/g, "");
	}

	/**
	 * Get filename for metric
	 * @param {*} metric
	 * @param {*} item
	 */
	getFilename(metric, item) {
		const metricName = this.formatMetricName(metric.name);
		if (this.opts.filenameFormatter)
			return this.opts.filenameFormatter.call(this, metricName, metric, item);

		switch (this.opts.mode) {
			case MODE_METRIC: {
				return path.join(this.folder, `${metricName}.csv`);
			}
			case MODE_LABEL: {
				const labelStr = this.labelsToStr(item.labels);
				return path.join(this.folder, metricName, `${metricName}${labelStr ? "--" + labelStr : ""}.csv`);
			}
		}
	}

	/**
	 * Write metrics values to files.
	 *
	 * @memberof CSVReporter
	 */
	flush() {
		const list = this.registry.list({
			types: this.opts.types,
			includes: this.opts.includes,
			excludes: this.opts.excludes,
		});

		if (list.length == 0)
			return;

		this.logger.debug("Write metrics values to CSV files...");

		list.forEach(metric => {
			metric.values.forEach(item => {
				// Is it changed?
				if (!this.lastChanges.has([metric.name, this.labelsToStr(item.labels)].join("|")))
					return;

				const filename = this.getFilename(metric, item);
				makeDirs(path.dirname(filename));
				const metricName = this.formatMetricName(metric.name);

				let headers = ["Timestamp", "Metric"];
				let data = [item.timestamp, metricName];

				metric.labelNames.forEach(label => {
					headers.push("Label " + label);
					data.push(item.labels[label] != null ? item.labels[label].toString() : "");
				});

				switch(metric.type) {
					case METRIC.TYPE_COUNTER:
					case METRIC.TYPE_GAUGE:
					case METRIC.TYPE_INFO: {
						if (item.value == null)
							return;

						headers.push("Value");
						data.push(item.value.toString());

						break;
					}
					case METRIC.TYPE_HISTOGRAM: {
						headers.push("Count"); data.push(item.count);
						headers.push("Sum"); data.push(item.sum);

						if (item.buckets) {
							Object.keys(item.buckets).forEach(b => {
								headers.push(`Bucket_${b}`); data.push(item.buckets[b]);
							});
						}

						if (item.quantiles) {
							headers.push("Min"); data.push(item.min);
							headers.push("Mean"); data.push(item.mean);
							headers.push("Var"); data.push(item.variance);
							headers.push("StdDev"); data.push(item.stdDev);
							headers.push("Max"); data.push(item.max);

							Object.keys(item.quantiles).forEach(key => {
								headers.push(`Quantile_${key}`); data.push(item.quantiles[key]);
							});
						}

						break;
					}
				}

				if (this.opts.rowFormatter)
					this.opts.rowFormatter.call(this, data, headers, metric, item);

				this.writeRow(filename, headers, data);
			});
		});

		this.lastChanges.clear();
	}

	/**
	 * Write a row in CSV file
	 * @param {String} filename
	 * @param {Array<String>} fields
	 */
	writeRow(filename, headers, fields) {
		try {
			if (!fs.existsSync(filename))
				fs.writeFileSync(filename, headers.join(this.opts.delimiter) + this.opts.rowDelimiter);

			fs.appendFileSync(filename, fields.join(this.opts.delimiter) + this.opts.rowDelimiter);

		} catch (err) {
			this.logger.error(`Unable to write metrics values to the '${filename}' file. Error: ${err.message}`, fields, err);
		}
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
	metricChanged(metric, value, labels) {
		if (!this.matchMetricName(metric.name)) return;

		this.lastChanges.add([metric.name, this.labelsToStr(labels)].join("|"));
	}
}

module.exports = CSVReporter;
