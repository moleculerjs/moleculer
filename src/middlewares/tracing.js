/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

function wrapLocalTracingMiddleware(handler, action) {
	let opts = action.tracing;
	if (opts === true || opts === false)
		opts = { enabled: !!opts };
	opts = _.defaultsDeep({}, opts, { enabled: true });

	if (this.isTracingEnabled() && opts.enabled) {
		return function tracingMiddleware(ctx) {

			const tags = {
				callingLevel: ctx.level,
				action: ctx.action ? {
					name: ctx.action.name
				} : null,
				remoteCall: ctx.nodeID !== ctx.broker.nodeID,
				callerNodeID: ctx.nodeID,
				options: {
					timeout: ctx.options.timeout,
					retries: ctx.options.retries
				}
			};

			if (_.isFunction(opts.tags)) {
				const res = opts.tags.call(ctx.service, ctx);
				if (res)
					Object.assign(tags, res);
			} else if (Array.isArray(opts.tags)) {
				opts.tags.forEach(key => {
					if (key.startsWith("#"))
						tags[key.slice(1)] = _.get(ctx.meta, key.slice(1));
					else
						tags[key] = _.get(ctx.params, key);
				});
			}

			const span = ctx.broker.tracer.startSpan(`call '${ctx.action.name}'`, {
				id: ctx.id,
				traceID: ctx.requestID,
				parentID: ctx.parentID,
				service: ctx.service ? {
					name: ctx.service.name,
					version: ctx.service.version,
					fullName: ctx.service.fullName,
				} : null,
				sampled: ctx.tracing,
				tags
			}, ctx);

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
