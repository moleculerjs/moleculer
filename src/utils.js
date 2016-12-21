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
				return broker.cacher.get(cacheKey);
			})
			.then((cachedJSON) => {
				if (cachedJSON != null) {
					// Found in the cache!
					return ctx.result(cachedJSON);
				}

				return handler(ctx).then((result) => {
					broker.cacher.set(cacheKey, result);

					return result;
				});					
			});
		};
	},

	wrapLogger(extLogger, moduleName) {
		let noop = function() {};

		let prefix = moduleName? "[" + moduleName + "] " : "";

		let logger = {};
		["log", "error", "warn", "info", "debug"].forEach(type => logger[type] = noop);

		if (extLogger) {
			["log", "error", "warn", "info", "debug"].forEach(type => {
				let externalMethod = extLogger[type] || extLogger.info || extLogger.log;
				if (externalMethod) {
					logger[type] = function(msg, ...args) {
						externalMethod(prefix + msg, ...args);
					}.bind(extLogger);
				}
			});
		}

		return logger;		
	},

	getNodeID() {
		return os.hostname().toLowerCase();
	},

	delay(ms) {
		/* istanbul ignore next */
		return () => new Promise(resolve => setTimeout(resolve, ms));
	},

	isPromise(p) {
		return (p && typeof p.then === "function" && typeof p.catch === "function");
	},

	String2Json(str) {
		try {
			if (str)
				return JSON.parse(str);				
		} catch (err) {
			/* istanbul ignore next */
			console.warn(err);
		}
	},

	Json2String(json) {
		try {
			if (json != null) 
				return JSON.stringify(json);
		} catch (err) {
			/* istanbul ignore next */
			console.warn(err);
		}
		return "";
	}
};

module.exports = utils;