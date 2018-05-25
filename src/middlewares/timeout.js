/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const { RequestTimeoutError } = require("../errors");

function wrapTimeoutMiddleware(handler, action) {
	return function timeoutMiddleware(ctx) {

		// Load opts with default values
		if (ctx.options.timeout == null && this.options.requestTimeout)
			ctx.options.timeout = this.options.requestTimeout || 0;

		if (ctx.options.timeout > 0 && !ctx.startHrTime) {
			// For distributed calls
			ctx.startHrTime = process.hrtime();
		}

		// Call the handler
		const p = handler(ctx);
		if (ctx.options.timeout > 0 && p.timeout) {
			return p.timeout(ctx.options.timeout)
				.catch(err => {
					if (err instanceof Promise.TimeoutError) {
						const actionName = ctx.action.name;
						const nodeID = ctx.nodeID;
						this.logger.warn(`Request '${actionName}' is timed out.`, { requestID: ctx.requestID, nodeID, timeout: ctx.options.timeout });
						err = new RequestTimeoutError({ action: actionName, nodeID });
					}
					return this.Promise.reject(err);
				});
		}

		return p;

	}.bind(this);
}

module.exports = function() {
	return {
		localAction: wrapTimeoutMiddleware,
		remoteAction: wrapTimeoutMiddleware
	};
};
