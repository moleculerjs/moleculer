const _ = require("lodash");
const { isFunction, isPlainObject, safetyObject } = require("moleculer").Utils;
const { api } = require("@opentelemetry/sdk-node");
const { SEMRESATTRS_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const tracer = api.trace.getTracer("moleculer-otel");

function flattenTags(obj, convertToString = false, path = "") {
	if (!obj) return null;

	return Object.keys(obj).reduce((res, k) => {
		const o = obj[k];
		const pp = (path ? path + "." : "") + k;

		if (isPlainObject(o)) Object.assign(res, flattenTags(o, convertToString, pp));
		else if (o !== undefined) {
			res[pp] = convertToString ? String(o) : o;
		}

		return res;
	}, {});
}

module.exports = {
	name: "OpenTelemetryMiddleware",

	localAction(handler, action) {
		let opts = action.tracing;
		if (opts === true || opts === false) opts = { enabled: !!opts };
		opts = _.defaultsDeep({}, opts, { enabled: true });

		if (opts.enabled) {
			return function tracingLocalActionMiddleware(ctx) {
				// Get the active span
				let parentCtx;
				const parentSpan = api.trace.getSpan(api.context.active());
				parentCtx = api.trace.setSpan(api.context.active(), parentSpan);
				if (!parentSpan && ctx.meta.$otel) {
					parentCtx = api.propagation.extract(parentCtx, ctx.meta.$otel);
					delete ctx.meta.$otel;
				}

				const actionObj = ctx.action
					? {
							name: ctx.action.name,
							rawName: ctx.action.rawName
						}
					: null;
				let tags = {
					callingLevel: ctx.level,
					action: actionObj,
					remoteCall: ctx.nodeID !== ctx.broker.nodeID,
					callerNodeID: ctx.nodeID,
					nodeID: ctx.broker.nodeID,
					options: {
						timeout: ctx.options.timeout,
						retries: ctx.options.retries
					},
					requestID: ctx.requestID
				};
				const globalActionTags = {}; //tracer.opts.tags.action;
				let actionTags;
				// local action tags take precedence
				if (isFunction(opts.tags)) {
					actionTags = opts.tags;
				} else if (!opts.tags && isFunction(globalActionTags)) {
					actionTags = globalActionTags;
				} else {
					// By default all params are captured. This can be overridden globally and locally
					actionTags = { ...{ params: true }, ...globalActionTags, ...opts.tags };
				}

				if (isFunction(actionTags)) {
					const res = actionTags.call(ctx.service, ctx);
					if (res) Object.assign(tags, res);
				} else if (isPlainObject(actionTags)) {
					if (actionTags.params === true)
						tags.params =
							ctx.params != null && isPlainObject(ctx.params)
								? Object.assign({}, ctx.params)
								: ctx.params;
					else if (Array.isArray(actionTags.params))
						tags.params = _.pick(ctx.params, actionTags.params);

					if (actionTags.meta === true)
						tags.meta = ctx.meta != null ? Object.assign({}, ctx.meta) : ctx.meta;
					else if (Array.isArray(actionTags.meta))
						tags.meta = _.pick(ctx.meta, actionTags.meta);
				}

				if (opts.safetyTags) {
					tags = safetyObject(tags);
				}

				let spanName = `action '${ctx.action.name}'`;
				if (opts.spanName) {
					switch (typeof opts.spanName) {
						case "string":
							spanName = opts.spanName;
							break;
						case "function":
							spanName = opts.spanName.call(ctx.service, ctx);
							break;
					}
				}

				const span = tracer.startSpan(
					spanName,
					{ attributes: flattenTags(tags), kind: api.SpanKind.CONSUMER },
					parentCtx
				);
				span.setAttribute(SEMRESATTRS_SERVICE_NAME, action.service.fullName);
				const spanContext = api.trace.setSpan(api.context.active(), span);
				return api.context.with(spanContext, () => {
					// Call the handler
					return handler(ctx)
						.then(res => {
							span.setAttribute("fromCache", ctx.cachedResult);

							if (isFunction(actionTags)) {
								const r = actionTags.call(ctx.service, ctx, res);
								if (r) Object.assign(tags, r);
							} else if (isPlainObject(actionTags)) {
								if (actionTags.response === true)
									tags.response =
										res != null && isPlainObject(res)
											? Object.assign({}, res)
											: res;
								else if (Array.isArray(actionTags.response))
									tags.response = _.pick(res, actionTags.response);
							}

							Object.keys(flattenTags(tags)).forEach(k =>
								span.setAttribute(k, tags[k])
							);
							span.end();

							return res;
						})
						.catch(err => {
							span.recordException(err);
							span.setStatus({ code: api.SpanStatusCode.ERROR });

							throw err;
						});
				});
			}.bind(this);
		}

		return handler;
	},

	remoteAction(handler, action) {
		return ctx => {
			const parentContext = api.context.active();
			const span = tracer.startSpan(
				`remote call ${ctx.action.name}`,
				{
					attributes: {
						action: flattenTags({
							name: ctx.action.name
						}),
						nodeID: ctx.nodeID
					},
					kind: api.SpanKind.PRODUCER
				},
				parentContext
			);
			span.setAttribute(SEMRESATTRS_SERVICE_NAME, action.service.fullName);

			const spanContext = api.trace.setSpan(api.context.active(), span);
			ctx.meta.$otel = {};
			api.propagation.inject(spanContext, ctx.meta.$otel);

			return api.context.with(spanContext, () => {
				// Call the handler
				return handler(ctx)
					.then(res => {
						span.end();
						return res;
					})
					.catch(err => {
						span.recordException(err);
						span.setStatus({ code: api.SpanStatusCode.ERROR });
						throw err;
					});
			});
		};
	}
};
