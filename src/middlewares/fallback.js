/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerError } = require("../errors");
const { METRIC }	= require("../metrics");

module.exports = function FallbackMiddleware(broker) {

	function wrapFallbackMiddleware(handler, action) {
		return function fallbackMiddleware(ctx) {
			// Call the handler
			return handler(ctx).catch(err => {

				// Handle fallback response from calling options
				if (ctx.options.fallbackResponse) {
					this.logger.warn(`The '${ctx.action.name}' request is failed. Return fallback response.`, { requestID: ctx.requestID, err: err.message });
					broker.metrics.increment(METRIC.MOLECULER_REQUEST_FALLBACK_TOTAL, { action: action.name });
					ctx.fallbackResult = true;

					if (_.isFunction(ctx.options.fallbackResponse))
						return ctx.options.fallbackResponse(ctx, err);
					else
						return Promise.resolve(ctx.options.fallbackResponse);
				}

				// Handle fallback from Action Definition (only locally)
				if (action.fallback && action.service) {
					const svc = action.service;

					const fallback = _.isString(action.fallback) ? svc[action.fallback] : action.fallback;
					if (!_.isFunction(fallback)) {
						/* istanbul ignore next */
						throw new MoleculerError(`The 'fallback' of '${action.name}' action is not a Function or valid method name: ${action.fallback}`);
					}

					svc.logger.warn(`The '${ctx.action.name}' request is failed. Return fallback response.`, { requestID: ctx.requestID, err: err.message });
					broker.metrics.increment(METRIC.MOLECULER_REQUEST_FALLBACK_TOTAL, { service: svc.fullName, action: action.name });
					ctx.fallbackResult = true;

					return fallback.call(svc, ctx, err);
				}

				return Promise.reject(err);
			});
		}.bind(this);
	}
	return {
		name: "Fallback",

		created(broker) {
			if (broker.isMetricsEnabled()) {
				broker.metrics.register({ name: METRIC.MOLECULER_REQUEST_FALLBACK_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["service", "action"], rate: true });
			}
		},

		localAction: wrapFallbackMiddleware,
		remoteAction: wrapFallbackMiddleware
	};
};
