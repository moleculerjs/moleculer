"use strict";

/*let TokenGenerator = require("uuid-token-generator");
let tokgen256 = new TokenGenerator(256, TokenGenerator.BASE62);
let tokgen128 = new TokenGenerator(128, TokenGenerator.BASE62);
*/
const uuidV4 = require("uuid/v4");
const hash	 = require("object-hash");
const os 	 = require("os");

let utils = {

	generateToken() {
		// return tokgen128.generate();
		return uuidV4();
	},
/*
	generateToken256() {
		//return tokgen256.generate();
		return uuidV4();
		// return "1"; 
	}
	*/

	getCacheKey(name, params) {
		return (name ? name + ":" : "") + (params ? hash(params) : "");
	},

	cachingWrapper(broker, action, handler) {
		return function(ctx) {
			let cacheKey = utils.getCacheKey(action.name, ctx.params);

			return broker.call("cache.get", { key: cacheKey })
			.catch(() => null) // silent error, skip
			.then((cachedJSON) => {
				if (cachedJSON != null) {
					// Found in the cache!
					return ctx.result(cachedJSON);
				}

				return handler(ctx).then((result) => {
					broker.call("cache.put", { key: cacheKey, data: result });
					return result;
				});					
			});
		};
	},

	getNodeID() {
		return os.hostname().toLowerCase();
	},

	isPromise(p) {
		return (p && typeof p.then === "function" && typeof p.catch === "function");
	}
};

module.exports = utils;