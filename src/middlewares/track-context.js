/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function TrackContextMiddleware() {

	const wrapTrackMiddleware = function(handler, action) {

		if (this.options.trackContext) {
			return function trackContextMiddleware(ctx) {

				// Add trackContext option from broker options
				if (ctx.callingOpts.trackContext === undefined && this.options.trackContext)
					ctx.callingOpts.trackContext = this.options.trackContext;

				if (ctx.callingOpts.trackContext) {
					ctx._trackContext();
				}

				// Call the handler
				let p = handler(ctx);

				if (ctx.tracked) {
					p = p.then(res => {
						ctx.dispose();
						return res;
					}).catch(err => {
						ctx.dispose();
						return this.Promise.reject(err);
					});
				}

				return p;
			}.bind(this);
		}

		return handler;
	};

	return {
		localAction: wrapTrackMiddleware
	};
};
