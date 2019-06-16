/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");
const chalk = require("chalk");
const METRIC = require("../constants");

/**
 * Console reporter for Moleculer Metrics
 *
 * @class ConsoleReporter
 * @extends {BaseReporter}
 */
class ConsoleReporter extends BaseReporter {

	/**
	 * Creates an instance of ConsoleReporter.
	 * @param {Object} opts
	 * @memberof ConsoleReporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			interval: 5 * 1000,
			logger: null,
			colors: true,
		});

		if (!this.opts.colors)
			chalk.level = 0;
	}

	/**
	 * Initialize reporter
	 * @param {MetricRegistry} registry
	 * @memberof ConsoleReporter
	 */
	init(registry) {
		super.init(registry);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.print(), this.opts.interval);
			this.timer.unref();
		}
	}

	/**
	 * Convert labels to label string
	 *
	 * @param {Object} labels
	 * @returns {String}
	 * @memberof ConsoleReporter
	 */
	labelsToStr(labels) {
		const keys = Object.keys(labels);
		if (keys.length == 0)
			return chalk.gray("{}");

		return chalk.gray("{") + keys.map(key => `${chalk.gray(this.formatLabelName(key))}: ${chalk.magenta(labels[key])}`).join(", ") + chalk.gray("}");
	}

	/**
	 * Print metrics to the console.
	 *
	 * @memberof ConsoleReporter
	 */
	print() {
		const list = this.registry.list({
			includes: this.opts.includes,
			excludes: this.opts.excludes,
		});

		this.log(chalk.gray(`------------------- [ METRICS START (${list.length}) ] -------------------`));

		list.forEach(metric => {
			this.log(chalk.cyan.bold(this.formatMetricName(metric.name)) + " " + chalk.gray("(" + metric.type + ")"));
			if (metric.values.size == 0) {
				this.log(chalk.gray("  <no values>"));
			} else {
				const unit = metric.unit ? chalk.gray(metric.unit) : "";
				metric.values.forEach(item => {
					let val;
					const labelStr = this.labelsToStr(item.labels);
					switch(metric.type) {
						case METRIC.TYPE_COUNTER:
						case METRIC.TYPE_GAUGE:
						case METRIC.TYPE_INFO:
							val = item.value === "" ? chalk.gray("<empty string>") : chalk.green.bold(item.value);
							break;
						case METRIC.TYPE_HISTOGRAM: {
							const s = [];
							s.push(`Count: ${item.count}`);

							if (item.buckets) {
								Object.keys(item.buckets).forEach(b => {
									s.push(`${b}: ${item.buckets[b] != null ? item.buckets[b] : "-"}`);
								});
							}

							if (item.quantiles) {
								s.push(`Min: ${item.min != null ? item.min.toFixed(2) : "-"}`);
								s.push(`Mean: ${item.mean != null ? item.mean.toFixed(2) : "-"}`);
								s.push(`Var: ${item.variance != null ? item.variance.toFixed(2) : "-"}`);
								s.push(`StdDev: ${item.stdDev != null ? item.stdDev.toFixed(2) : "-"}`);
								s.push(`Max: ${item.max != null ? item.max.toFixed(2) : "-"}`);

								Object.keys(item.quantiles).forEach(key => {
									s.push(`${key}: ${item.quantiles[key] != null ? item.quantiles[key].toFixed(2) : "-"}`);
								});
							}

							val = chalk.green.bold(s.join(" | "));
							break;
						}
					}
					this.log(`  ${labelStr}: ${val} ${unit}`);
				});
			}
			this.log("");
		});

		this.log(chalk.gray(`-------------------- [ METRICS END (${list.length}) ] --------------------`));
	}


	log(...args) {
		if (_.isFunction(this.opts.logger)) {
			return this.opts.logger(...args);
		} else {
			return this.logger.info(...args);
		}
	}
}

module.exports = ConsoleReporter;
