/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { RequestTimeoutError } = require("../errors");

module.exports = function() {

	const wrapTimeoutMiddleware = function wrapTimeoutMiddleware(handler, action) {
		return function timeoutMiddleware(ctx) {
			const actionName = ctx.action.name;
			const nodeID = ctx.nodeID;

			// Call the handler
			const p = handler(ctx);
			if (ctx.timeout > 0 && p.timeout) {
				return p.timeout(ctx.timeout)
					.catch(err => {
						if (err instanceof Promise.TimeoutError) {
							this.logger.warn(`Action '${actionName}' timed out on '${nodeID}'.`, { requestID: ctx.requestID });
							err = new RequestTimeoutError(actionName, nodeID);
						}
						return this.Promise.reject(err);
					});
			}

			return p;

		}.bind(this);
	};

	return {
		localAction: wrapTimeoutMiddleware,
		remoteAction: wrapTimeoutMiddleware
	};
};
