/*
 * servicer
 * Copyright (c) 2017 Icebob (https://github.com/icebob/servicer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const _ 			= require("lodash");
const { hash } 		= require("node-object-hash")({ sort: false, coerce: false});
const { isPromise }	= require("../utils");

/**
 * Abstract cacher class
 * 
 * @class Cacher
 */
class Cacher {

	/**
	 * Creates an instance of Cacher.
	 * 
	 * @param {object} opts
	 * 
	 * @memberOf Cacher
	 */
	constructor(opts) {
		this.opts = _.defaultsDeep(opts, {
			prefix: "",
			ttl: null
		});

		this.prefix = this.opts.prefix;
	}

	/**
	 * Initialize cacher
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf Cacher
	 */
	init(broker) {
		this.broker = broker;
		if (this.broker) {
			this.logger = broker.getLogger("CACHER");

			this.broker.on("cache.clean", ({ match }) => {
				this.clean(match);
			});

			this.broker.on("cache.del", ({ key }) => {
				this.del(key);
			});
		}
	}

	/**
	 * Close cacher
	 * 
	 * @memberOf Cacher
	 */
	close() {
	}

	/**
	 * Get a cached content by key
	 * 
	 * @param {any} key
	 * 
	 * @memberOf Cacher
	 */
	get(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Set a content by key to cache
	 * 
	 * @param {any} key
	 * @param {any} data
	 * 
	 * @memberOf Cacher
	 */
	set(key, data) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Delete a content by key from cache
	 * 
	 * @param {any} key
	 * 
	 * @memberOf Cacher
	 */
	del(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}


	/**
	 * Clean cache. Remove every key by match
	 * @param {any} match string. Default is "**"
	 * @returns {Promise}
	 * 
	 * @memberOf Cacher
	 */
	clean(match = "**") {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Get a cache key by name and params. 
	 * Concatenate the name and the hashed params object
	 * 
	 * @param {any} name
	 * @param {any} params
	 * @param {any} keys
	 * @returns
	 */
	getCacheKey(name, params, keys) {
		let hashKey = "";
		if (params && Object.keys(params).length > 0) {
			if (keys && keys.length > 0)
				hashKey = keys.map(key => params[key]).join("-");
			else
				hashKey = hash(params);
		}
		return (name ? name + ":" : "") + hashKey;
	}

	/**
	 * Create a wrapped action handler which handle caching functions
	 * 
	 * @param {any} action
	 * @returns
	 */
	wrapHandler(action, handler) {
		return (ctx) => {
			const cacheKey = this.getCacheKey(action.name, ctx.params, action.cache.keys);

			return Promise.resolve()
			.then(() => {
				return this.get(cacheKey);
			})
			.then((cachedJSON) => {
				if (cachedJSON != null) {
					// Found in the cache! 
					ctx.cachedResult = true;
					return cachedJSON;
				}

				const result = handler(ctx);
				if (isPromise(result)) {
					return result.then(data => {
						this.set(cacheKey, data);
						return data;
					});
				} else {
					this.set(cacheKey, result);
					return result;
				}
			});
		};
	}
		
}

module.exports = Cacher;
