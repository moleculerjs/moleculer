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
				if (ctx.options.trackContext === undefined && this.options.trackContext)
					ctx.options.trackContext = this.options.trackContext;

				if (ctx.options.trackContext) {
					if (ctx.service) {
						ctx.tracked = true;
						ctx.service._addActiveContext(ctx);
					}
				}

				// Call the handler
				let p = handler(ctx);

				if (ctx.tracked) {
					p = p.then(res => {
						if (ctx.service && ctx.tracked)
							ctx.service._removeActiveContext(ctx);

						return res;
					}).catch(err => {
						if (ctx.service && ctx.tracked)
							ctx.service._removeActiveContext(ctx);

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
