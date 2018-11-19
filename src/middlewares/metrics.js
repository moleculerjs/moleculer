/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

let sampleCounter = 0;

/**
 * Check should metric the current context
 *
 * @param {Context} ctx
 * @returns {Boolean}
 *
 * @memberof ServiceBroker
 */
function shouldMetric(ctx) {
	if (ctx.broker.options.metrics) {
		sampleCounter++;
		if (sampleCounter * ctx.broker.options.metricsRate >= 1.0) {
			sampleCounter = 0;
			return true;
		}
	}

	return false;
}

/**
 * Start metrics & send metric event.
 *
 * @param {Context} ctx
 *
 * @private
 */
function metricStart(ctx) {
	ctx.startTime = Date.now();
	ctx.startHrTime = process.hrtime();
	ctx.duration = 0;

	if (ctx.metrics) {
		const payload = generateMetricPayload(ctx);
		ctx.broker.emit("metrics.trace.span.start", payload);
	}
}

/**
 * Generate metrics payload
 *
 * @param {Context} ctx
 * @returns {Object}
 */
function generateMetricPayload(ctx) {
	let payload = {
		id: ctx.id,
		requestID: ctx.requestID,
		level: ctx.level,
		startTime: ctx.startTime,
		remoteCall: ctx.nodeID !== ctx.broker.nodeID
	};

	// Process extra metrics
	processExtraMetrics(ctx, payload);

	if (ctx.action) {
		payload.action = {
			name: ctx.action.name
		};
	}
	if (ctx.service) {
		payload.service = {
			name: ctx.service.name,
			version: ctx.service.version
		};
	}

	if (ctx.parentID)
		payload.parent = ctx.parentID;

	payload.nodeID = ctx.broker.nodeID;
	if (payload.remoteCall)
		payload.callerNodeID = ctx.nodeID;

	return payload;
}

/**
 * Stop metrics & send finish metric event.
 *
 * @param {Context} ctx
 * @param {Error} error
 *
 * @private
 */
function metricFinish(ctx, error) {
	if (ctx.startHrTime) {
		let diff = process.hrtime(ctx.startHrTime);
		ctx.duration = (diff[0] * 1e3) + (diff[1] / 1e6); // milliseconds
	}
	ctx.stopTime = ctx.startTime + ctx.duration;

	if (ctx.metrics) {
		const payload = generateMetricPayload(ctx);
		payload.endTime = ctx.stopTime;
		payload.duration = ctx.duration;
		payload.fromCache = ctx.cachedResult;

		if (error) {
			payload.error = {
				name: error.name,
				code: error.code,
				type: error.type,
				message: error.message
			};
		}

		ctx.broker.emit("metrics.trace.span.finish", payload);
	}
}

/**
 * Assign extra metrics taking into account action definitions
 *
 * @param {Context} ctx
 * @param {string} name Field of the context to be assigned.
 * @param {any} payload Object for assignement.
 *
 * @private
 */
function assignExtraMetrics(ctx, name, payload) {
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
 * @param {any} payload Object for assignement.
 *
 * @private
 */
function processExtraMetrics(ctx, payload) {
	// extra metrics (params and meta)
	if (_.isObject(ctx.action.metrics)) {
		// custom metrics def
		assignExtraMetrics(ctx, "params", payload);
		assignExtraMetrics(ctx, "meta", payload);
	}
}

function wrapLocalMetricsMiddleware(handler) {

	if (this.options.metrics) {
		return function metricsMiddleware(ctx) {
			if (ctx.metrics == null) {
				ctx.metrics = shouldMetric(ctx);
			}

			if (ctx.metrics === true) {

				metricStart(ctx);

				// Call the handler
				return handler(ctx).then(res => {
					metricFinish(ctx, null);
					return res;
				}).catch(err => {
					metricFinish(ctx, err);
					return this.Promise.reject(err);
				});
			}

			return handler(ctx);

		}.bind(this);
	}

	return handler;
}

function wrapRemoteMetricsMiddleware(handler) {

	if (this.options.metrics) {
		return function metricsMiddleware(ctx) {
			if (ctx.metrics == null) {
				ctx.metrics = shouldMetric(ctx);
			}
			return handler(ctx);

		}.bind(this);
	}

	return handler;
}

module.exports = function MetricsMiddleware() {
	return {
		localAction: wrapLocalMetricsMiddleware,
		remoteAction: wrapRemoteMetricsMiddleware
	};
};
