/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseReporter = require("./base");
const _ = require("lodash");

/**
 * Import types
 *
 * @typedef {import("../registry")} MetricRegistry
 * @typedef {import("./event").EventReporterOptions} EventReporterOptions
 * @typedef {import("./event")} EventReporterClass
 * @typedef {import("../types/base").BaseMetricPOJO} BaseMetricPOJO
 * @typedef {import("../types/base")} BaseMetric
 */

/**
 * Event reporter for Moleculer Metrics
 *
 * @class EventReporter
 * @extends {BaseReporter}
 * @implements {EventReporterClass}
 */
class EventReporter extends BaseReporter {
	/**
	 * Creates an instance of EventReporter.
	 * @param {EventReporterOptions} opts
	 * @memberof EventReporter
	 */
	constructor(opts) {
		super(opts);

		/** @type {EventReporterOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			eventName: "$metrics.snapshot",

			broadcast: false,
			groups: null,

			onlyChanges: false,

			interval: 5
		});

		this.lastChanges = new Set();
	}

	/**
	 * Initialize reporter.
	 *
	 * @param {MetricRegistry} registry
	 * @memberof EventReporter
	 */
	init(registry) {
		super.init(registry);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.sendEvent(), this.opts.interval * 1000);
			this.timer.unref();
		}
	}

	/**
	 * Send metrics snapshot via event.
	 *
	 * @memberof EventReporter
	 */
	sendEvent() {
		let list = this.registry.list({
			includes: this.opts.includes,
			excludes: this.opts.excludes
		});

		if (this.opts.onlyChanges) list = list.filter(metric => this.lastChanges.has(metric.name));

		if (list.length === 0) return;

		if (this.opts.broadcast) {
			this.logger.debug(`Send metrics.snapshot (${list.length} metrics) broadcast events.`);
			this.broker.broadcast(this.opts.eventName, list, { groups: this.opts.groups });
		} else {
			this.logger.debug(`Send metrics.snapshot (${list.length} metrics) events.`);
			this.broker.emit(this.opts.eventName, list, { groups: this.opts.groups });
		}

		this.lastChanges.clear();
	}

	/**
	 * Some metric has been changed.
	 *
	 * @param {BaseMetric} metric
	 * @memberof BaseReporter
	 */
	metricChanged(metric) {
		if (!this.matchMetricName(metric.name)) return;

		this.lastChanges.add(metric.name);
	}
}

module.exports = EventReporter;
