/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { GracefulStopTimeoutError } = require("../errors");

function wrapTrackMiddleware(handler, action) {
	if (this.options.trackContext) {
		const removeContext = (ctx) => {
			const idx = ctx.service._activeContexts.indexOf(ctx);
			if (idx !== -1) {
				ctx.service._activeContexts.splice(idx, 1);
			}
		};

		return function ContextTrackerMiddleware(ctx) {

			// Add trackContext option from broker options
			if (ctx.options.trackContext === undefined && this.options.trackContext)
				ctx.options.trackContext = this.options.trackContext;

			if (ctx.options.trackContext) {
				if (ctx.service) {
					ctx.tracked = true;
					ctx.service._activeContexts.push(ctx);
				}
			}

			// Call the handler
			let p = handler(ctx);

			if (ctx.tracked) {
				p = p.then(res => {
					if (ctx.service && ctx.tracked)
						removeContext(ctx);

					return res;
				}).catch(err => {
					if (ctx.service && ctx.tracked)
						removeContext(ctx);

					return this.Promise.reject(err);
				});
			}

			return p;
		}.bind(this);
	}

	return handler;
}

module.exports = function ContextTrackerMiddleware() {
	return {
		localAction: wrapTrackMiddleware,

		// Before a local service started
		serviceStarting(service) {
			service._activeContexts = [];
		},

		// Before a local service stopping
		serviceStopping(service) {
			if (service._activeContexts.length === 0)
				return service.Promise.resolve();

			return new service.Promise((resolve) => {
				const timeout = setTimeout(() => {
					service.logger.error(new GracefulStopTimeoutError({ service }));
					resolve();
				}, service.settings.$gracefulStopTimeout || service.broker.options.gracefulStopTimeout);

				let first = true;
				const checkForContexts = () => {
					if (service._activeContexts.length === 0) {
						clearTimeout(timeout);
						resolve();
					} else {
						if (first) {
							service.logger.warn(`Waiting for ${service._activeContexts.length} running context(s)...`);
							first = false;
						}
						setTimeout(checkForContexts, 100);
					}
				};
				setImmediate(checkForContexts);
			});
		},
	};
};
