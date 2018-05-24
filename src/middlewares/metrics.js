/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function MetricsMiddleware() {

	/*
		TODO: move here broker.shouldMetrics
	*/

	const wrapMetricsMiddleware = function(handler, action) {

		if (this.options.metrics) {
			return function metricsMiddleware(ctx) {
				if (ctx.metrics === true || ctx.timeout > 0)
					ctx._metricStart(ctx.metrics);

				// Call the handler
				let p = handler(ctx);

				if (ctx.metrics === true) {
					// Call metrics finish
					p = p.then(res => {
						ctx._metricFinish(null, ctx.metrics);
						return res;
					}).catch(err => {
						ctx._metricFinish(err, ctx.metrics);
						return this.Promise.reject(err);
					});
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
