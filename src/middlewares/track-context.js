/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function middleware() {

	const wrapTrackMiddleware = function wrapReplyMiddleware(handler, action) {

		if (this.broker.options.trackContext) {
			return function trackContextMiddleware(ctx) {

				/*if (opts.trackContext) {
					ctx._trackContext();
				}*/

				// Call the handler
				return handler(ctx)
					.then(res => {
						ctx.dispose();
						return res;
					}).catch(err => {
						ctx.dispose();
						return this.Promise.reject(err);
					});
			}.bind(this);
		}

		return handler;
	};

	return {
		localAction: wrapTrackMiddleware
	};
};
