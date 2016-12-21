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

			return Promise.resolve()
			.then(() => {
				return broker.call("cache.get", { key: cacheKey });
			})
			.catch(() => null) // silent error, no cache module
			.then((cachedJSON) => {
				if (cachedJSON != null) {
					// Found in the cache!
					return ctx.result(cachedJSON);
				}

				return handler(ctx).then((result) => {
					try {
						broker.call("cache.put", { key: cacheKey, data: result });
					} catch(err) {
						// Ignored. No cache module
					}

					return result;
				});					
			});
		};
	},

	getNodeID() {
		return os.hostname().toLowerCase();
	},


	delay(ms) {
		return () => new Promise(resolve => setTimeout(resolve, ms));
	},

	isPromise(p) {
		return (p && typeof p.then === "function" && typeof p.catch === "function");
	},

	String2Json(str) {
		try {
			if (str != "")
				return JSON.parse(str);				
		} catch (err) {
			console.warn(err);
		}
	},

	Json2String(json) {
		try {
			if (json != null) 
				return JSON.stringify(json);
		} catch (err) {
			console.warn(err);
		}
		return "";
	}
};

module.exports = utils;