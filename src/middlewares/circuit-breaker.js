/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { CIRCUIT_HALF_OPEN } = require("../constants");

/*
	TODO: move here CB logic from EndpointCB
*/

function wrapCBMiddleware(handler, action) {
	const opts = this.options.circuitBreaker;

	if (opts.enabled) {
		return function circuitBreakerMiddleware(ctx) {

		// Handle half-open state in circuit breaker
			if (ctx.endpoint.state == CIRCUIT_HALF_OPEN) {
				ctx.endpoint.circuitHalfOpenWait();
			}

			// Call the handler
			return handler(ctx).then(res => {
				if (ctx.endpoint)
					ctx.endpoint.success();
				return res;
			}).catch(err => {
				if (opts.check && opts.check(err)) {
					// Only if local error
					if (ctx.endpoint && (!err.nodeID || err.nodeID == ctx.nodeID))
						ctx.endpoint.failure(err);
				}

				return this.Promise.reject(err);
			});
		}.bind(this);
	}

	return handler;
}

module.exports = function() {
	return {
		localAction: wrapCBMiddleware,
		remoteAction: wrapCBMiddleware
	};
};
