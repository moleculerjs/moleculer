/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird"); // eslint-disable-line no-unused-vars
const _ = require("lodash");
const Exporters = require("./exporters");

const Span = require("./span");

/**
 * Moleculer Tracer class
 */
class Tracer {

	/**
	 * Creates an instance of Tracer.
	 *
	 * @param {ServiceBroker} broker
	 * @param {Object} opts
	 * @memberof Tracer
	 */
	constructor(broker, opts) {
		this.broker = broker;
		this.logger = broker.getLogger("tracer");

		if (opts === true || opts === false)
			opts = { enabled: opts };

		this.opts = _.defaultsDeep({}, opts, {
			enabled: true,
			sampling: {
				rate: 1.0, // 0.0, 0.5
				//TODO: qps: 1.0 // 1 trace / 1 sec (ratelimiting sampling https://opencensus.io/tracing/sampling/ratelimited/ )
				minPriority: null
			},

			actions: true,
			methods: false,
			events: false,

			stackTrace: false,

			defaultTags: null,
		});

		this.sampleCounter = 0;

		if (this.opts.enabled)
			this.logger.info("Tracing: Enabled");
		else
			this.logger.info("Tracing: Disabled");
	}

	/**
	 * Initialize Tracer.
	 */
	init() {
		if (this.opts.enabled) {

			// Create Exporter instances
			if (this.opts.exporter) {
				const exporters = Array.isArray(this.opts.exporter) ? this.opts.exporter : [this.opts.exporter];

				this.exporter = exporters.map(r => {
					const exporter = Exporters.resolve(r);
					exporter.init(this);
					return exporter;
				});
			}
		}
	}

	/**
	 * Check tracing is enabled
	 *
	 * @returns {boolean}
	 * @memberof MetricRegistry
	 */
	isEnabled() {
		return this.opts.enabled;
	}

	/**
	 * Decide that span should be sampled.
	 *
	 * @param {Span} span
	 * @returns {Boolean}
	 * @memberof Tracer
	 */
	shouldSample(span) {
		if (this.opts.sampling.minPriority != null) {
			if (span.priority < this.opts.sampling.minPriority)
				return false;
		}

		if (this.opts.sampling.rate == 0)
			return false;

		if (this.opts.sampling.rate == 1)
			return true;

		if (this.sampleCounter * this.opts.sampling.rate >= 1.0) {
			this.sampleCounter = 0;
			return true;
		}

		return false;
	}

	/**
	 * Start a new Span.
	 *
	 * @param {String} name
	 * @param {Object?} opts
	 * @param {Context} ctx
	 * @returns {Span}
	 *
	 * @memberof Tracer
	 */
	startSpan(name, opts, ctx) {
		const span = new Span(this, name, Object.assign({
			type: "custom",
			defaultTags: this.opts.defaultTags
		}, opts), ctx);

		span.start();

		return span;
	}

	/**
	 * Invoke Exporter method.
	 *
	 * @param {String} method
	 * @param {Array<any>} args
	 * @memberof Tracer
	 */
	invokeExporter(method, args) {
		if (this.exporter) {
			this.exporter.forEach(exporter => exporter[method].apply(exporter, args));
		}
	}
}

module.exports = Tracer;
