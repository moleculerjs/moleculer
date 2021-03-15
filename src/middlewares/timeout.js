/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { RequestTimeoutError } = require("../errors");
const { METRIC }	= require("../metrics");

module.exports = function(broker) {

	function wrapTimeoutMiddleware(handler, action) {
		const actionTimeout = action.timeout;
		const actionName = action.name;
		const service = action.service ? action.service.fullName : null;

		return function timeoutMiddleware(ctx) {

			// Load opts with default values
			if (ctx.options.timeout == null) {
				if (actionTimeout != null)
					ctx.options.timeout = actionTimeout;
				else
					ctx.options.timeout = broker.options.requestTimeout;
			}

			if (ctx.options.timeout > 0 && !ctx.startHrTime) {
			// For distributed timeout calculation need to be set
				ctx.startHrTime = process.hrtime();
			}

			// Call the handler
			const p = handler(ctx);
			if (ctx.options.timeout > 0 && p.timeout) {
				return p.timeout(ctx.options.timeout)
					.catch(err => {
						if (err instanceof broker.Promise.TimeoutError) {
							const nodeID = ctx.nodeID;
							this.logger.warn(`Request '${actionName}' is timed out.`, { requestID: ctx.requestID, nodeID, timeout: ctx.options.timeout });
							err = new RequestTimeoutError({ action: actionName, nodeID });

							broker.metrics.increment(METRIC.MOLECULER_REQUEST_TIMEOUT_TOTAL, { service, action: actionName });
						}
						throw err;
					});
			}

			return p;

		}.bind(this);
	}

	return {
		name: "Timeout",

		created(broker) {
			if (broker.isMetricsEnabled()) {
				broker.metrics.register({ name: METRIC.MOLECULER_REQUEST_TIMEOUT_TOTAL, type: METRIC.TYPE_COUNTER, labelNames: ["service", "action"], description: "Number of timed out requests", rate: true });
			}
		},

		localAction: wrapTimeoutMiddleware,
		remoteAction: wrapTimeoutMiddleware
	};
};
