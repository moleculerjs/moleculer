/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { match } = require("../../utils");

class BaseReporter {

	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			interval: 5 * 1000,

			includes: null,
			excludes: null,
			metricNameFormatter: null, // TODO
			labelNameFormatter: null // TODO
		});

		if (_.isString(this.opts.includes))
			this.opts.includes = [this.opts.includes];

		if (_.isString(this.opts.excludes))
			this.opts.excludes = [this.opts.excludes];
	}

	init(registry) {
		this.registry = registry;
		this.broker = this.registry.broker;
	}

	matchMetricName(name) {
		if (Array.isArray(this.opts.includes)) {
			if (!this.opts.includes.some(pattern => match(name, pattern)))
				return false;
		}

		if (Array.isArray(this.opts.excludes)) {
			if (!this.opts.excludes.every(pattern => !match(name, pattern)))
				return false;
		}

		return true;
	}
}

module.exports = BaseReporter;
