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

// https://www.dropwizard.io/1.0.0/docs/manual/configuration.html#polymorphic-configuration
class ConsoleReporter extends BaseReporter {

	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			logger: null
		});

		/* eslint-disable no-console */
		this.logger = this.opts.logger || console.log;
	}

	init(registry) {
		super.init(registry);

		setInterval(() => this.print(), this.opts.interval).unref();
	}

	labelsToStr(labels) {
		const keys = Object.keys(labels);
		if (keys.length == 0)
			return chalk.gray("{}");

		return chalk.gray("{") + keys.map(key => `${chalk.gray(this.formatLabelName(key))}: ${chalk.magenta(labels[key])}`).join(", ") + chalk.gray("}");
	}

	print() {
		const store = this.registry.store;
		this.logger(chalk.gray(`------------------- [ METRICS START (${store.size}) ] -------------------`));

		store.forEach(metric => {
			if (!this.matchMetricName(metric.name)) return;

			this.logger(chalk.cyan.bold(this.formatMetricName(metric.name)) + " " + chalk.gray("(" + metric.type + ")"));
			const snapshot = metric.snapshot();
			if (snapshot.size == 0) {
				this.logger(chalk.gray("  <no values>"));
			} else {
				const unit = metric.unit ? chalk.gray(metric.unit) : "";
				snapshot.forEach(item => {
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
					this.logger(`  ${labelStr}: ${val} ${unit}`);
				});
			}
			this.logger("");
		});

		this.logger(chalk.gray(`-------------------- [ METRICS END (${store.size}) ] --------------------`));
	}
}

module.exports = ConsoleReporter;
