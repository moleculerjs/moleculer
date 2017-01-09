/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

let utils = require("../utils");

module.exports = function cachingMiddleware(broker, cacher) {
	cacher.init(broker);

	return function cacheWrapper(ctx, next) {

		let cacheKey = utils.getCacheKey(ctx.action.name, ctx.params);
		let p = Promise.resolve()
		.then(() => {
			if (ctx.action.cache === true)
				return cacher.get(cacheKey);
		})
		.then((cachedJSON) => {
			if (cachedJSON != null) {
				// Found in the cache! 
				ctx.cachedResult = true;
				//return next.then(() => cachedJSON);
				return cachedJSON;
			}
		});	

		return next(p).then((data) => {
			if (ctx.action.cache === true && !ctx.cachedResult)
				cacher.set(cacheKey, data);

			return data;
		});
	};
};