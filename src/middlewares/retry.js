/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

function wrapRetryMiddleware(handler, action) {
	// Merge action option and broker options
	const broker = this;
	const opts = Object.assign({}, broker.options.retryPolicy, action.retryPolicy || {});
	if (opts.enabled) {
		return function retryMiddleware(ctx) {
			const attempts = typeof ctx.options.retries === "number" ? ctx.options.retries : opts.retries;
			if (ctx._retryAttempts == null)
				ctx._retryAttempts = 0;

			// Call the handler
			return handler(ctx).catch(err => {
				// Skip retry if it is a remote call. The retry logic will run on the caller node
				// because the Retry middleware wrap the `remoteAction` hook, as well.
				if (ctx.nodeID != broker.nodeID && ctx.endpoint.local)
					return Promise.reject(err);

				if (ctx._retryAttempts++ < attempts && opts.check(err)) {
					// Retry call
					const actionName = ctx.action.name;

					// Calculate next delay
					const delay = Math.min(opts.delay * Math.pow(opts.factor, ctx._retryAttempts - 1), opts.maxDelay);

					this.logger.warn(`Retry to call '${actionName}' action after ${delay} ms...`, { requestID: ctx.requestID, attempts: ctx._retryAttempts });

					// Wait & recall
					return this.Promise.delay(delay)
						.then(() => this.call(actionName, ctx.params, { ctx }));
				}

				// Throw error
				return Promise.reject(err);
			});
		}.bind(this);
	}

	return handler;
}

module.exports = function RetryMiddleware() {
	return {
		localAction: wrapRetryMiddleware,
		remoteAction: wrapRetryMiddleware
	};
};
