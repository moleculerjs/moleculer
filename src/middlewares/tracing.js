/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

/**
 * Generate tracing payload
 *
 * @param {Context} ctx
 * @returns {Object}
 *
function generateTracingPayload(ctx) {
	let payload = {
		id: ctx.id,
		requestID: ctx.requestID,
		level: ctx.level,
		startTime: ctx.startTime,
		remoteCall: ctx.nodeID !== ctx.broker.nodeID
	};

	// Process extra tracing
	processExtraTracing(ctx, payload);

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
*/

/**
 * Stop tracing & send finish metric event.
 *
 * @param {Context} ctx
 * @param {Error} error
 *
 * @private
 *
function tracingFinish(ctx, error) {
	if (ctx.startHrTime) {
		let diff = process.hrtime(ctx.startHrTime);
		ctx.duration = (diff[0] * 1e3) + (diff[1] / 1e6); // milliseconds
	}
	ctx.stopTime = ctx.startTime + ctx.duration;

	if (ctx.tracing) {
		const payload = generateTracingPayload(ctx);
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

		ctx.broker.emit("tracing.span.finish", payload);
	}
}
*/

/**
 * Assign extra tracing taking into account action definitions
 *
 * @param {Context} ctx
 * @param {string} name Field of the context to be assigned.
 * @param {any} payload Object for assignement.
 *
 * @private
 *
function assignExtraTracing(ctx, name, payload) {
	let def = ctx.action.tracing[name];
	// if tracing definitions is boolean do default, tracing=true
	if (def === true) {
		payload[name] = ctx[name];
	} else if (_.isArray(def)) {
		payload[name] = _.pick(ctx[name], def);
	} else if (_.isFunction(def)) {
		payload[name] = def(ctx[name]);
	}
}*/

/**
 * Decide and process extra tracing taking into account action definitions
 *
 * @param {Context} ctx
 * @param {any} payload Object for assignement.
 *
 * @private
 *
function processExtraTracing(ctx, payload) {
	// extra tracing (params and meta)
	if (_.isObject(ctx.action.tracing)) {
		// custom tracing def
		assignExtraTracing(ctx, "params", payload);
		assignExtraTracing(ctx, "meta", payload);
	}
}
*/

function wrapLocalTracingMiddleware(handler) {

	if (this.isTracingEnabled()) {
		return function tracingMiddleware(ctx) {
			const span = ctx.broker.tracer.startSpan(`call '${ctx.action.name}'`, {
				id: ctx.id,
				traceID: ctx.requestID,
				parentID: ctx.parentID,
				sampled: ctx.tracing,
				tags: {
					callingLevel: ctx.level,
					action: ctx.action ? {
						name: ctx.action.name
					} : null,
					service: ctx.service ? {
						name: ctx.service.name,
						version: ctx.service.version,
					} : null,
					remoteCall: ctx.nodeID !== ctx.broker.nodeID,
					callerNodeID: ctx.nodeID,
					options: {
						timeout: ctx.options.timeout,
						retries: ctx.options.retries
					}
				}
			});

			ctx.tracing = span.sampled;
			ctx.span = span;

			// Call the handler
			return handler(ctx).then(res => {
				span.addTags({
					fromCache: ctx.cachedResult
				}).finish();

				//ctx.duration = span.duration;

				return res;
			}).catch(err => {
				span.setError(err).finish();

				return this.Promise.reject(err);
			});

		}.bind(this);
	}

	return handler;
}

/*
function wrapRemoteTracingMiddleware(handler) {

	if (this.options.tracing) {
		return function tracingMiddleware(ctx) {
			if (ctx.tracing == null) {
				ctx.tracing = shouldTracing(ctx);
			}
			return handler(ctx);

		}.bind(this);
	}

	return handler;
}*/

module.exports = function TracingMiddleware() {
	return {
		localAction: wrapLocalTracingMiddleware,
		//remoteAction: wrapRemoteTracingMiddleware
	};
};
