/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerError } = require("../errors");

module.exports = function() {

	const wrapErrorHandler = function wrapErrorHandler(handler, action) {
		return function errorHandlerMiddleware(ctx) {
			// Call the handler
			return handler(ctx)
				.catch(err => {
					if (!(err instanceof Error)) {
						err = new MoleculerError(err, 500);
					}

					err.ctx = ctx;

					if (ctx.nodeID != this.nodeID) {
						// Remove pending request (the request didn't reach the target service)
						this.transit.removePendingRequest(ctx.id);
					}

					this.logger.debug(`The '${ctx.action.name}' request is rejected.`, { requestID: ctx.requestID }, err);

					// Handle fallback response
					if (ctx.callingOpts.fallbackResponse) {
						this.logger.warn(`The '${ctx.action.name}' request is failed. Returns fallback response.`, { requestID: ctx.requestID });
						if (_.isFunction(ctx.callingOpts.fallbackResponse))
							return ctx.callingOpts.fallbackResponse(ctx, err);
						else
							return Promise.resolve(ctx.callingOpts.fallbackResponse);
					}

					return Promise.reject(err);

				});

		}.bind(this);
	};

	return {
		localAction: wrapErrorHandler,
		remoteAction: wrapErrorHandler
	};
};
