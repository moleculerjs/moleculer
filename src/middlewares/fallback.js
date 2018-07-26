/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerError } = require("../errors");

function wrapFallbackMiddleware(handler, action) {
	return function fallbackMiddleware(ctx) {
		// Call the handler
		return handler(ctx).catch(err => {

			// Handle fallback response from calling options
			if (ctx.options.fallbackResponse) {
				this.logger.warn(`The '${ctx.action.name}' request is failed. Return fallback response.`, { requestID: ctx.requestID, err: err.message });

				if (_.isFunction(ctx.options.fallbackResponse))
					return ctx.options.fallbackResponse(ctx, err);
				else
					return Promise.resolve(ctx.options.fallbackResponse);
			}

			// Handle fallback from Action Definition (only locally)
			if (action.fallback && action.service) {
				const svc = action.service;

				svc.logger.warn(`The '${ctx.action.name}' request is failed. Return fallback response.`, { requestID: ctx.requestID, err: err.message });

				const fallback = _.isString(action.fallback) ? svc[action.fallback] : action.fallback;
				if (_.isFunction(fallback)) {
					return fallback.call(svc, ctx, err);
				}

				/* istanbul ignore next */
				throw new MoleculerError(`The 'fallback' of '${action.name}' action is not a Function or valid method name: ${action.fallback}`);
			}

			return Promise.reject(err);
		});
	}.bind(this);
}

module.exports = function FallbackMiddleware() {
	return {
		localAction: wrapFallbackMiddleware,
		remoteAction: wrapFallbackMiddleware
	};
};
