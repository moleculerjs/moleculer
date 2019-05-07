/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird"); // eslint-disable-line no-unused-vars
const _ = require("lodash");
const Exporters = require("./exporters");
const AsyncStorage = require("../async-storage");
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

			actions: true, // TODO
			methods: false, // TODO
			events: false, // TODO

			errorFields: ["name", "message", "code", "type", "data"],
			stackTrace: false,

			defaultTags: null,
		});

		if (this.opts.stackTrace && this.opts.errorFields.indexOf("stack") === -1)
			this.opts.errorFields.push("stack");

		this.sampleCounter = 0;

		this.contextWrappers = [];

		this.scope = new AsyncStorage(this.broker);
		this.scope.enable();

		if (this.opts.enabled)
			this.logger.info("Tracing: Enabled");
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

	wrappingContext(span, fn) {
		if (this.contextWrappers.length == 0) return fn();

		return this.contextWrappers[0](span, fn);
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
		const currentSpan = this.getCurrentSpan();

		const span = new Span(this, name, Object.assign({
			type: "custom",
			parentID: currentSpan ? currentSpan.id : null,
			defaultTags: this.opts.defaultTags
		}, opts), ctx);

		//console.log(`Start span: ${this.scope.getAsyncId()} - ${name}`);

		this.setCurrentSpan(span);

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

	setCurrentSpan(span) {
		const state = this.scope.getSessionData() || {
			spans: []
		};

		state.spans.push(span);
		this.scope.setSessionData(state);
		//console.log(`Set data: ${this.scope.getAsyncId()}`);
	}

	removeCurrentSpan(span) {
		//console.log(`Remove data: ${this.scope.getAsyncId()}`);
		const state = this.scope.getSessionData();
		if (state && state.spans.length > 0) {
			const idx = state.spans.indexOf(span);
			if (idx >= 0)
				state.spans.splice(idx, 1);
		}
	}

	getCurrentSpan() {
		//console.log(`Get data: ${this.scope.getAsyncId()}`);
		const state = this.scope.getSessionData();
		return state ? state.spans[state.spans.length - 1] : null;
	}

	getCurrentTraceID() {
		const span = this.getCurrentSpan();
		return span ? span.traceID : null;
	}

	getParentSpanID() {
		const span = this.getCurrentSpan();
		return span ? span.id : null;
	}

	spanFinished(span) {
		this.removeCurrentSpan(span);
		this.invokeExporter("finishSpan", [span]);
	}
}

module.exports = Tracer;
