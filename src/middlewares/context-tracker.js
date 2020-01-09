/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { GracefulStopTimeoutError } = require("../errors");

function addContext(ctx) {
	if (ctx.service) {
		// Local request
		ctx.service._trackedContexts.push(ctx);
	} else {
		// Remote request
		ctx.broker._trackedContexts.push(ctx);
	}
}

function removeContext(ctx) {
	if (ctx.service) {
		const idx = ctx.service._trackedContexts.indexOf(ctx);
		if (idx !== -1)
			ctx.service._trackedContexts.splice(idx, 1);
	} else {
		const idx = ctx.broker._trackedContexts.indexOf(ctx);
		if (idx !== -1)
			ctx.broker._trackedContexts.splice(idx, 1);
	}
}

function wrapTrackerMiddleware(handler) {
	if (this.options.tracking && this.options.tracking.enabled) {

		return function ContextTrackerMiddleware(ctx) {

			const tracked = ctx.options.tracking != null ? ctx.options.tracking : this.options.tracking.enabled;

			// If no need to track
			if (!tracked)
				return handler(ctx);

			// Track the context
			addContext(ctx);

			// Call the handler
			let p = handler(ctx);

			p = p.then(res => {
				removeContext(ctx);
				return res;
			}).catch(err => {
				removeContext(ctx);
				throw err;
			});

			return p;
		}.bind(this);
	}

	return handler;
}

function waitingForActiveContexts(list, logger, time, service) {
	if (!list || list.length === 0)
		return Promise.resolve(); // TODO broker.Promise

	return new Promise((resolve) => { // TODO broker.Promise
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			logger.error(new GracefulStopTimeoutError({ service }));
			list.length = 0; // Clear pointers
			resolve();
		}, time);

		let first = true;
		const checkForContexts = () => {
			if (list.length === 0) {
				clearTimeout(timeout);
				resolve();
			} else {
				if (first) {
					logger.warn(`Waiting for ${list.length} running context(s)...`);
					first = false;
				}
				if (!timedOut)
					setTimeout(checkForContexts, 100);
			}
		};
		setImmediate(checkForContexts);
	});
}

module.exports = function ContextTrackerMiddleware() {
	return {
		name: "ContextTracker",

		localAction: wrapTrackerMiddleware,
		remoteAction: wrapTrackerMiddleware,

		localEvent: wrapTrackerMiddleware,

		// After the broker created
		created(broker) {
			broker._trackedContexts = [];
		},

		// Before a local service started
		serviceStarting(service) {
			service._trackedContexts = [];
		},

		// Before a local service stopping
		serviceStopping(service) {
			return waitingForActiveContexts(service._trackedContexts, service.logger, service.settings.$shutdownTimeout || service.broker.options.tracking.shutdownTimeout, service);
		},

		// Before broker stopping
		stopping(broker) {
			return waitingForActiveContexts(broker._trackedContexts, broker.logger, broker.options.tracking.shutdownTimeout);
		},
	};
};
