/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");
const kleur = require("kleur");
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
			onlyChanges: true,
		});

		if (!this.opts.colors)
			kleur.enabled = false;

		this.lastChanges = new Set();
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
			return kleur.gray("{}");

		return kleur.gray("{") + keys.map(key => `${kleur.gray(this.formatLabelName(key))}: ${kleur.magenta("" + labels[key])}`).join(", ") + kleur.gray("}");
	}

	/**
	 * Print metrics to the console.
	 *
	 * @memberof ConsoleReporter
	 */
	print() {
		let list = this.registry.list({
			includes: this.opts.includes,
			excludes: this.opts.excludes,
		});

		if (this.opts.onlyChanges)
			list = list.filter(metric => this.lastChanges.has(metric.name));

		if (list.length == 0)
			return;

		this.log(kleur.gray(`------------------- [ METRICS START (${list.length}) ] -------------------`));

		list.forEach(metric => {
			this.log(kleur.cyan().bold(this.formatMetricName(metric.name)) + " " + kleur.gray("(" + metric.type + ")"));
			if (metric.values.size == 0) {
				this.log(kleur.gray("  <no values>"));
			} else {
				const unit = metric.unit ? kleur.gray(this.registry.pluralizeUnit(metric.unit)) : "";
				metric.values.forEach(item => {
					let val;
					const labelStr = this.labelsToStr(item.labels);
					switch(metric.type) {
						case METRIC.TYPE_COUNTER:
						case METRIC.TYPE_GAUGE:
						case METRIC.TYPE_INFO:
							val = item.value === "" ? kleur.gray("<empty string>") : kleur.green().bold(item.value);
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

							val = kleur.green().bold(s.join(" | "));
							break;
						}
					}
					this.log(`  ${labelStr}: ${val} ${unit}`);
				});
			}
			this.log("");
		});

		this.log(kleur.gray(`-------------------- [ METRICS END (${list.length}) ] --------------------`));

		this.lastChanges.clear();
	}

	/**
	 * Print messages
	 *
	 * @param  {...any} args
	 */
	log(...args) {
		if (_.isFunction(this.opts.logger)) {
			return this.opts.logger(...args);
		} else {
			return this.logger.info(...args);
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
	metricChanged(metric) {
		if (!this.matchMetricName(metric.name)) return;

		this.lastChanges.add(metric.name);
	}
}

module.exports = ConsoleReporter;
