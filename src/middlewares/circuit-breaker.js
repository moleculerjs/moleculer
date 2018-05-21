/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function middleware(globalOptions) {

	const wrapCBMiddleware = function wrapCBMiddleware(handler, action) {

		if (this.options.circuitBreaker.enabled) {
			return function circuitBreakerMiddleware(ctx) {

				// Call the handler
				return handler(ctx).then(res => {
					// TODO: need ctx.endpoint
					ctx.endpoint.success();
					return res;
				}).catch(err => {
					// Only if local error
					if (!err.nodeID || err.nodeID == this.broker.nodeID)
						ctx.endpoint.failure(err);

					return this.Promise.reject(err);
				});
			}.bind(this);
		}

		return handler;
	};

	return {
		localAction: wrapCBMiddleware,
		remoteAction: wrapCBMiddleware
	};
};
