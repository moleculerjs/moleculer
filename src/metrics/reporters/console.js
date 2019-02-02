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

		return chalk.gray("{") + keys.map(key => `${chalk.gray(key)}: ${chalk.magenta(labels[key])}`).join(", ") + chalk.gray("}");
	}

	print() {
		const store = this.registry.store;
		this.logger(chalk.gray(`------------------- [ METRICS START (${store.size}) ] -------------------`));

		store.forEach(item => {
			if (!this.matchMetricName(item.name)) return;

			this.logger(chalk.cyan.bold(item.name) + " " + chalk.gray("(" + item.type + ")"));
			const values = item.values;
			if (values.size == 0) {
				this.logger(chalk.gray("  <no values>"));
			} else {
				values.forEach(valueItem => {
					let val;
					switch(item.type) {
						case METRIC.TYPE_COUNTER:
						case METRIC.TYPE_GAUGE:
						case METRIC.TYPE_INFO:
							val = valueItem.value === "" ? chalk.gray("<empty string>") : chalk.green.bold(valueItem.value);
							break;
						case METRIC.TYPE_HISTOGRAM:
							val = chalk.green.bold(item.toString(valueItem));
							break;
					}
					this.logger(`  ${this.labelsToStr(valueItem.labels)}: ${val} ${item.unit ? chalk.gray(item.unit) : ""}`);
				});
			}
			this.logger("");
		});


		this.logger(chalk.gray(`-------------------- [ METRICS END (${store.size}) ] --------------------`));
	}

}

module.exports = ConsoleReporter;
