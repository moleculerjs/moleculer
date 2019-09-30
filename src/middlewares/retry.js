/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { METRIC }	= require("../metrics");

module.exports = function RetryMiddleware(broker) {

	function wrapRetryMiddleware(handler, action) {
		const actionName = action.name;
		const service = action.service ? action.service.fullName : null;
		// Merge action option and broker options
		const opts = Object.assign({}, this.options.retryPolicy, action.retryPolicy || {});
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

					// Check the error's `retryable` property.
					if (opts.check(err)) {
						ctx._retryAttempts++;
						broker.metrics.increment(METRIC.MOLECULER_REQUEST_RETRY_ATTEMPTS_TOTAL, { service, action: action.name });

						if (ctx._retryAttempts < attempts) {
						// Retry call

							// Calculate next delay
							const delay = Math.min(opts.delay * Math.pow(opts.factor, ctx._retryAttempts - 1), opts.maxDelay);

							broker.logger.warn(`Retry to call '${actionName}' action after ${delay} ms...`, { requestID: ctx.requestID, attempts: ctx._retryAttempts });

							// Wait & recall
							return broker.Promise.delay(delay)
								.then(() => {
									if (action.visibility == "private")
										return ctx.service.actions[action.rawName](ctx.params, { ctx });

									return broker.call(actionName, ctx.params, { ctx });
								});
						}
					}

					// Throw error
					return Promise.reject(err);
				});
			}.bind(this);
		}

		return handler;
	}

	return {
		name: "Retry",

		created() {
			if (broker.isMetricsEnabled()) {
				broker.metrics.register({ name: METRIC.MOLECULER_REQUEST_RETRY_ATTEMPTS_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["service", "action"], rate: true });
			}
		},

		localAction: wrapRetryMiddleware,
		remoteAction: wrapRetryMiddleware
	};
};
