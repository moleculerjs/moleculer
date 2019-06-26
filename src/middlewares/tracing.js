/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

module.exports = function TracingMiddleware(broker) {

	const tracer = broker.tracer;

	function tracingLocalActionMiddleware(handler, action) {
		let opts = action.tracing;
		if (opts === true || opts === false)
			opts = { enabled: !!opts };
		opts = _.defaultsDeep({}, opts, { enabled: true, tags: { params: true } });

		if (opts.enabled) {
			return function tracingLocalActionMiddleware(ctx) {

				ctx.requestID = tracer.getCurrentTraceID() || ctx.requestID;
				ctx.parentID = tracer.getActiveSpanID() || ctx.parentID;

				const tags = {
					callingLevel: ctx.level,
					action: ctx.action ? {
						name: ctx.action.name,
						rawName: ctx.action.rawName
					} : null,
					remoteCall: ctx.nodeID !== ctx.broker.nodeID,
					callerNodeID: ctx.nodeID,
					nodeID: ctx.broker.nodeID,
					options: {
						timeout: ctx.options.timeout,
						retries: ctx.options.retries
					}
				};

				if (_.isFunction(opts.tags)) {
					const res = opts.tags.call(ctx.service, ctx);
					if (res)
						Object.assign(tags, res);

				} else if (_.isPlainObject(opts.tags)) {
					if (opts.tags.params === true)
						tags.params = _.cloneDeep(ctx.params);
					else if (Array.isArray(opts.tags.params))
						tags.params = _.pick(ctx.params, opts.tags.params);

					if (opts.tags.meta === true)
						tags.meta = _.cloneDeep(ctx.meta);
					else if (Array.isArray(opts.tags.meta))
						tags.meta = _.pick(ctx.meta, opts.tags.meta);
				}

				const span = ctx.startSpan(`action '${ctx.action.name}'`, {
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

					throw err;
				});

			}.bind(this);
		}

		return handler;
	}

	function tracingLocalEventMiddleware(handler, event) {
		const service = event.service;

		let opts = event.tracing;
		if (opts === true || opts === false)
			opts = { enabled: !!opts };
		opts = _.defaultsDeep({}, opts, { enabled: true, tags: { params: true }  });

		if (opts.enabled) {
			return function tracingLocalEventMiddleware(ctx) {

				// ctx.requestID = tracer.getCurrentTraceID() || ctx.requestID;
				// ctx.parentID = tracer.getActiveSpanID() || ctx.parentID;

				const tags = {
					event: {
						name: event.name,
						group: event.group
					},
					eventName: ctx.eventName,
					eventType: ctx.eventType,
					callerNodeID: ctx.nodeID,
					remoteCall: ctx.nodeID !== broker.nodeID,
					nodeID: broker.nodeID
				};

				if (_.isFunction(opts.tags)) {
					const res = opts.tags.call(service, ctx);
					if (res)
						Object.assign(tags, res);

				} else if (_.isPlainObject(opts.tags)) {
					if (opts.tags.params === true)
						tags.params = _.cloneDeep(ctx.params);
					else if (Array.isArray(opts.tags.params))
						tags.params = _.pick(ctx.params, opts.tags.params);

					if (opts.tags.meta === true)
						tags.meta = _.cloneDeep(ctx.meta);
					else if (Array.isArray(opts.tags.meta))
						tags.meta = _.pick(ctx.meta, opts.tags.meta);
				}

				const span = broker.tracer.startSpan(`event '${ctx.eventName}'`, {
					id: ctx.id,
					traceID: ctx.requestID,
					parentID: ctx.parentID,
					service: {
						name: service.name,
						version: service.version,
						fullName: service.fullName,
					},
					sampled: ctx.tracing,
					tags
				});

				// Call the handler
				return handler.apply(service, arguments).then(() => {
					span.finish();
				}).catch(err => {
					span.setError(err).finish();
					return service.Promise.reject(err);
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
	return {
		name: "Tracing",

		localAction: broker.isTracingEnabled() && tracer.opts.actions ? tracingLocalActionMiddleware : null,
		localEvent: broker.isTracingEnabled() && tracer.opts.events ? tracingLocalEventMiddleware : null,
		//remoteAction: wrapRemoteTracingMiddleware
	};
};
