/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function ReplyMiddleware(options) {
	const wrapReplyMiddleware = function(handler, action) {
		const opts = options || this.options.retryPolicy;

		// Merge retryPolicy from action option with broker options
		const policy = Object.assign({}, opts, action.retryPolicy || {});
		if (policy.enabled) {
			return function retryMiddleware(ctx) {
				const attempts = ctx.options.retries ? ctx.options.retries : policy.retries;
				if (ctx._retryAttempts == null)
					ctx._retryAttempts = 0;

				// Call the handler
				return handler(ctx).catch(err => {
					if (ctx._retryAttempts++ < attempts && policy.check(err)) {
						// Retry call
						const actionName = ctx.action.name;

						// Calculate next delay
						const delay = Math.min(policy.delay * Math.pow(policy.factor, ctx._retryAttempts - 1), policy.maxDelay);

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
	};

	return {
		localAction: wrapReplyMiddleware,
		remoteAction: wrapReplyMiddleware
	};
};
