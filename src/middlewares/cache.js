/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

const Promise	= require("bluebird");
const { hash } 	= require("node-object-hash")({ sort: false, coerce: false});

function getCacheKey(name, params, keys) {
	let hashKey = "";
	if (params && Object.keys(params).length > 0) {
		if (keys && keys.length > 0)
			hashKey = keys.map(key => params[key]).join("-");
		else
			hashKey = hash(params);
	}
	return (name ? name + ":" : "") + hashKey;
}

module.exports = function cachingMiddleware(broker, cacher) {
	cacher.init(broker);

	return function cacheWrapper(ctx, next) {

		let cacheKey = getCacheKey(ctx.action.name, ctx.params, ctx.action.cache.keys);
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