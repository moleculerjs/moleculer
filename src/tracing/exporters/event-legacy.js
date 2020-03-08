"use strict";

const _ 					= require("lodash");
const BaseTraceExporter 	= require("./base");

/**
 * Event Trace Exporter. It sends same trace events as in Moleculer <= v0.13.
 *
 * @class EventLegacyTraceExporter
 */
class EventLegacyTraceExporter extends BaseTraceExporter {

	/**
	 * Creates an instance of EventLegacyTraceExporter.
	 * @param {Object?} opts
	 * @memberof EventLegacyTraceExporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
		});
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof EventLegacyTraceExporter
	 */
	init(tracer) {
		super.init(tracer);
		this.broker = tracer.broker;
	}

	/**
	 * Span is started.
	 *
	 * @param {Span} span
	 * @memberof BaseTraceExporter
	 */
	spanStarted(span) {
		const payload = this.generateMetricPayload(span);
		this.broker.emit("metrics.trace.span.start", payload);
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof EventLegacyTraceExporter
	 */
	spanFinished(span) {
		const payload = this.generateMetricPayload(span);
		this.broker.emit("metrics.trace.span.finish", payload);
	}

	/**
	 * Generate metrics payload
	 *
	 * @param {Context} ctx
	 * @returns {Object}
	 */
	generateMetricPayload(span) {
		let payload = {
			id: span.id,
			requestID: span.traceID,
			level: span.tags.callingLevel,
			startTime: span.startTime,
			remoteCall: span.tags.remoteCall
		};

		// Process extra metrics
		if (span.opts.ctx)
			this.processExtraMetrics(span.opts.ctx, payload);

		payload.action = span.tags.action;
		payload.service = span.service;

		if (span.parentID)
			payload.parent = span.parentID;

		payload.nodeID = this.broker.nodeID;
		if (payload.remoteCall)
			payload.callerNodeID = span.tags.callerNodeID;

		if (span.finishTime) {
			payload.endTime = span.finishTime;
			payload.duration = span.duration;
			payload.fromCache = span.tags.fromCache;

			if (span.error) {
				payload.error = {
					name: span.error.name,
					code: span.error.code,
					type: span.error.type,
					message: span.error.message
				};
			}
		}

		return payload;
	}

	/**
	 * Assign extra metrics taking into account action definitions
	 *
	 * @param {Context} ctx
	 * @param {string} name Field of the context to be assigned.
	 * @param {any} payload Object for assignment.
	 *
	 * @private
	 */
	assignExtraMetrics(ctx, name, payload) {
		let def = ctx.action.metrics[name];
		// if metrics definitions is boolean do default, metrics=true
		if (def === true) {
			payload[name] = ctx[name];
		} else if (_.isArray(def)) {
			payload[name] = _.pick(ctx[name], def);
		} else if (_.isFunction(def)) {
			payload[name] = def(ctx[name]);
		}
	}

	/**
	 * Decide and process extra metrics taking into account action definitions
	 *
	 * @param {Context} ctx
	 * @param {any} payload Object for assignment.
	 *
	 * @private
	 */
	processExtraMetrics(ctx, payload) {
		// extra metrics (params and meta)
		if (_.isObject(ctx.action.metrics)) {
			// custom metrics def
			this.assignExtraMetrics(ctx, "params", payload);
			this.assignExtraMetrics(ctx, "meta", payload);
		}
	}


}

module.exports = EventLegacyTraceExporter;
