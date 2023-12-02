/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const BaseTraceExporter = require("./base");
const { isFunction } = require("../../utils");

/**
 * Import types
 *
 * @typedef {import("./event")} EventTraceExporterClass
 * @typedef {import("./event").EventTraceExporterOptions} EventTraceExporterOptions
 * @typedef {import("../tracer")} Tracer
 * @typedef {import("../span")} Span
 */

/**
 * Event Trace Exporter.
 *
 * @class EventTraceExporter
 * @implements {EventTraceExporterClass}
 */
class EventTraceExporter extends BaseTraceExporter {
	/**
	 * Creates an instance of EventTraceExporter.
	 * @param {EventTraceExporterOptions?} opts
	 * @memberof EventTraceExporter
	 */
	constructor(opts) {
		super(opts);

		/** @type {EventTraceExporterOptions} */
		this.opts = _.defaultsDeep(this.opts, {
			eventName: "$tracing.spans",

			sendStartSpan: false,
			sendFinishSpan: true,

			broadcast: false,

			groups: null,

			interval: 5,

			spanConverter: null,

			defaultTags: null
		});

		this.queue = [];
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof EventTraceExporter
	 */
	init(tracer) {
		super.init(tracer);

		if (this.opts.interval > 0) {
			this.timer = setInterval(() => this.flush(), this.opts.interval * 1000);
			this.timer.unref();
		}

		this.defaultTags = isFunction(this.opts.defaultTags)
			? this.opts.defaultTags.call(this, tracer)
			: this.opts.defaultTags;
	}

	/**
	 * Stop Trace exporter
	 */
	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		return this.Promise.resolve();
	}

	/**
	 * Span is started.
	 *
	 * @param {Span} span
	 * @memberof BaseTraceExporter
	 */
	spanStarted(span) {
		if (this.opts.sendStartSpan) {
			if (span.tags.eventName == this.opts.eventName) return;

			this.queue.push(span);
			if (!this.timer) this.flush();
		}
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof EventTraceExporter
	 */
	spanFinished(span) {
		if (this.opts.sendFinishSpan) {
			if (span.tags.eventName == this.opts.eventName) return;

			this.queue.push(span);
			if (!this.timer) this.flush();
		}
	}

	/**
	 * Flush tracing data to Datadog server
	 *
	 * @memberof EventTraceExporter
	 */
	flush() {
		if (this.queue.length === 0) return;

		const data = this.generateTracingData();
		this.queue.length = 0;

		if (this.opts.broadcast) {
			this.logger.debug(`Send tracing spans (${data.length} spans) broadcast events.`);
			this.broker.broadcast(this.opts.eventName, data, { groups: this.opts.groups });
		} else {
			this.logger.debug(`Send tracing spans (${data.length} spans) events.`);
			this.broker.emit(this.opts.eventName, data, { groups: this.opts.groups });
		}
	}

	/**
	 * Generate tracing data with custom converter
	 *
	 * @returns {Record<string, any>[]}
	 * @memberof EventTraceExporter
	 */
	generateTracingData() {
		if (isFunction(this.opts.spanConverter))
			return this.queue.map(span => this.opts.spanConverter.call(this, span));

		return Array.from(this.queue).map(span => {
			const newSpan = Object.assign({}, span);
			if (newSpan.error) newSpan.error = this.errorToObject(span.error);

			return newSpan;
		});
	}
}

module.exports = EventTraceExporter;
