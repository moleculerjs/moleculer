/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function throttleMiddleware(broker) {
	function wrapEventThrottleMiddleware(handler, event) {
		if (event.throttle > 0) {
			let lastInvoke = 0;

			return function throttleMiddleware(ctx) {
				const now = Date.now();
				if (now - lastInvoke < event.throttle) {
					return broker.Promise.resolve();
				}
				lastInvoke = now;
				return handler(ctx);
			}.bind(this);
		}
		return handler;
	}

	return {
		name: "Throttle",

		localEvent: wrapEventThrottleMiddleware
	};
};
