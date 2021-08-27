/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { MoleculerError } = require("../errors");

function wrapActionErrorHandler(handler) {
	return function errorHandlerMiddleware(ctx) {
		// Call the handler
		return handler(ctx).catch(err => {
			if (!(err instanceof Error)) err = new MoleculerError(err, 500);

			if (ctx.nodeID !== this.nodeID) {
				// Remove pending request (the request didn't reach the target service)
				if (this.transit) this.transit.removePendingRequest(ctx.id);
			}

			this.logger.debug(
				`The '${ctx.action.name}' request is rejected.`,
				{ requestID: ctx.requestID },
				err
			);

			Object.defineProperty(err, "ctx", {
				value: ctx,
				writable: true,
				enumerable: false
			});

			// Call global errorHandler
			return ctx.broker.errorHandler(err, {
				ctx,
				service: ctx.service,
				action: ctx.action
			});
		});
	}.bind(this);
}

function wrapEventErrorHandler(handler) {
	return function errorHandlerMiddleware(ctx) {
		// Call the handler
		return handler(ctx)
			.catch(err => {
				if (!(err instanceof Error)) err = new MoleculerError(err, 500);

				this.logger.debug(
					`Error occured in the '${ctx.event.name}' event handler in the '${ctx.service.fullName}' service.`,
					{ requestID: ctx.requestID },
					err
				);

				Object.defineProperty(err, "ctx", {
					value: ctx,
					writable: true,
					enumerable: false
				});

				// Call global errorHandler (may choose to resolve error)
				return ctx.broker.errorHandler(err, {
					ctx,
					service: ctx.service,
					event: ctx.event
				});
			})
			.catch(err => {
				// No global error Handler, or thrown further, log and re-throw. Pass responsibility to the transit layer.
				ctx.broker.logger.error(err);
        throw err;
			});
	}.bind(this);
}

module.exports = function () {
	return {
		name: "ErrorHandler",

		localAction: wrapActionErrorHandler,
		remoteAction: wrapActionErrorHandler,

		localEvent: wrapEventErrorHandler
	};
};
