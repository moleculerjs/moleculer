/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function middleware(globalOptions) {

	const wrapMetricsMiddleware = function wrapMetricsMiddleware(handler, action) {

		if (this.metrics) {
			return function metricsMiddleware(ctx) {
				if (ctx.metrics === true || ctx.timeout > 0)
					ctx._metricStart(ctx.metrics);

				// Call the handler
				let p = handler(ctx);

				if (ctx.metrics === true) {
					// Call metrics finish
					p = p.then(res => {
						if (ctx.metrics)
							ctx._metricFinish(null, ctx.metrics);

						return res;
					}).catch(err => ctx._metricFinish(err, ctx.metrics));
				}

				return p;


			}.bind(this);
		}

		return handler;
	};

	return {
		localAction: wrapMetricsMiddleware
	};
};
