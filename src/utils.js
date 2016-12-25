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

	/**
	 * Get a cache key by name and params. 
	 * Concatenate the name and the hashed params object
	 * 
	 * @param {any} name
	 * @param {any} params
	 * @returns
	 */
	getCacheKey(name, params) {
		return (name ? name + ":" : "") + (params ? hash(params) : "");
	},

	/**
	 * Create a wrapped action handler which handle caching functions
	 * 
	 * @param {any} broker
	 * @param {any} action
	 * @param {any} handler
	 * @returns
	 */
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

	/**
	 * Create a sub-logger by external logger.
	 * 
	 * @param {any} extLogger
	 * @param {any} moduleName
	 * @returns
	 */
	wrapLogger(extLogger, moduleName) {
		let noop = function() {};

		let prefix = moduleName? "[" + moduleName + "] " : "";

		let logger = {};
		["log", "error", "warn", "info", "debug"].forEach((type) => logger[type] = noop);

		if (extLogger) {
			["log", "error", "warn", "info", "debug"].forEach((type) => {
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

	/**
	 * Get default NodeID (computerName)
	 * 
	 * @returns
	 */
	getNodeID() {
		return os.hostname().toLowerCase();
	},

	/**
	 * Delay for Promises
	 * 
	 * @param {any} ms
	 * @returns
	 */
	delay(ms) {
		/* istanbul ignore next */
		return () => new Promise((resolve) => setTimeout(resolve, ms));
	},

	/**
	 * Check the param is a Promise instance
	 * 
	 * @param {any} p
	 * @returns
	 */
	isPromise(p) {
		return (p && typeof p.then === "function" && typeof p.catch === "function");
	},

	/**
	 * Convert string to Javascript object. (Handle exceptions)
	 * If string is empty or null or invalid JSON, returns with `undefined`
	 * 
	 * @param {any} str
	 * @returns
	 */
	string2Json(str) {
		try {
			if (str)
				return JSON.parse(str);				
		} catch (err) {
			/* istanbul ignore next */
			console.warn(err);
		}
	},

	/**
	 * Convert a JS object to string (stringify)
	 * If param is null or undefined, returns with empty string (handle exception)
	 * 
	 * @param {any} json
	 * @returns
	 */
	json2String(json) {
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