/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { isFunction, isPlainObject } = require("../utils");

module.exports = function TracingMiddleware(broker) {

	const tracer = broker.tracer;

	function tracingLocalActionMiddleware(handler, action) {
		let opts = action.tracing;
		if (opts === true || opts === false)
			opts = { enabled: !!opts };
		opts = _.defaultsDeep({}, opts, { enabled: true, tags: { params: true } });

		if (opts.enabled) {
			return function tracingLocalActionMiddleware(ctx) {

				ctx.requestID = ctx.requestID || tracer.getCurrentTraceID();
				ctx.parentID = ctx.parentID || tracer.getActiveSpanID();

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

				if (isFunction(opts.tags)) {
					const res = opts.tags.call(ctx.service, ctx);
					if (res)
						Object.assign(tags, res);

				} else if (isPlainObject(opts.tags)) {
					if (opts.tags.params === true)
						tags.params = ctx.params != null && isPlainObject(ctx.params) ? Object.assign({}, ctx.params) : ctx.params;
					else if (Array.isArray(opts.tags.params))
						tags.params = _.pick(ctx.params, opts.tags.params);

					if (opts.tags.meta === true)
						tags.meta = ctx.meta != null ? Object.assign({}, ctx.meta) : ctx.meta;
					else if (Array.isArray(opts.tags.meta))
						tags.meta = _.pick(ctx.meta, opts.tags.meta);
				}

				let spanName = `action '${ctx.action.name}'`;
				if (opts.spanName) {
					switch(typeof opts.spanName) {
						case "string":
							spanName = opts.spanName;
							break;
						case "function":
							spanName = opts.spanName.call(ctx.service, ctx);
							break;
					}
				}

				const span = ctx.startSpan(spanName, {
					id: ctx.id,
					type: "action",
					traceID: ctx.requestID,
					parentID: ctx.parentID,
					service: ctx.service,
					sampled: ctx.tracing,
					tags
				});

				ctx.tracing = span.sampled;

				// Call the handler
				return handler(ctx).then(res => {
					const tags = {
						fromCache: ctx.cachedResult
					};

					if (isFunction(opts.tags)) {
						const r = opts.tags.call(ctx.service, ctx, res);
						if (r)
							Object.assign(tags, r);

					} else if (isPlainObject(opts.tags)) {
						if (opts.tags.response === true)
							tags.response = res != null && isPlainObject(res) ? Object.assign({}, res) : res;
						else if (Array.isArray(opts.tags.response))
							tags.response = _.pick(res, opts.tags.response);
					}

					span.addTags(tags);
					ctx.finishSpan(span);

					//ctx.duration = span.duration;

					return res;
				}).catch(err => {
					span.setError(err);
					ctx.finishSpan(span);

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

				ctx.requestID = ctx.requestID || tracer.getCurrentTraceID();
				ctx.parentID = ctx.parentID || tracer.getActiveSpanID();

				const tags = {
					event: {
						name: event.name,
						group: event.group
					},
					eventName: ctx.eventName,
					eventType: ctx.eventType,
					callerNodeID: ctx.nodeID,
					callingLevel: ctx.level,
					remoteCall: ctx.nodeID !== broker.nodeID,
					nodeID: broker.nodeID
				};

				if (isFunction(opts.tags)) {
					const res = opts.tags.call(service, ctx);
					if (res)
						Object.assign(tags, res);

				} else if (isPlainObject(opts.tags)) {
					if (opts.tags.params === true)
						tags.params = ctx.params != null && isPlainObject(ctx.params) ? Object.assign({}, ctx.params) : ctx.params;
					else if (Array.isArray(opts.tags.params))
						tags.params = _.pick(ctx.params, opts.tags.params);

					if (opts.tags.meta === true)
						tags.meta = ctx.meta != null ? Object.assign({}, ctx.meta) : ctx.meta;
					else if (Array.isArray(opts.tags.meta))
						tags.meta = _.pick(ctx.meta, opts.tags.meta);
				}

				let spanName = `event '${ctx.eventName}' in '${service.fullName}'`;
				if (opts.spanName) {
					switch(typeof opts.spanName) {
						case "string":
							spanName = opts.spanName;
							break;
						case "function":
							spanName = opts.spanName.call(service, ctx);
							break;
					}
				}

				const span = ctx.startSpan(spanName, {
					id: ctx.id,
					type: "event",
					traceID: ctx.requestID,
					parentID: ctx.parentID,
					service,
					sampled: ctx.tracing,
					tags
				});

				ctx.tracing = span.sampled;

				// Call the handler
				return handler.apply(service, arguments).then(() => {
					ctx.finishSpan(span);
				}).catch(err => {
					span.setError(err);
					ctx.finishSpan(span);
					throw err;
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
