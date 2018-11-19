/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { MoleculerError } = require("../errors");

function wrapErrorHandler(handler) {
	return function errorHandlerMiddleware(ctx) {
		// Call the handler
		return handler(ctx)
			.catch(err => {
				if (!(err instanceof Error))
					err = new MoleculerError(err, 500);

				if (ctx.nodeID !== this.nodeID) {
					// Remove pending request (the request didn't reach the target service)
					this.transit.removePendingRequest(ctx.id);
				}

				this.logger.debug(`The '${ctx.action.name}' request is rejected.`, { requestID: ctx.requestID }, err);

				err.ctx = ctx;

				return Promise.reject(err);
			});

	}.bind(this);
}

module.exports = function() {
	return {
		localAction: wrapErrorHandler,
		remoteAction: wrapErrorHandler
	};
};
