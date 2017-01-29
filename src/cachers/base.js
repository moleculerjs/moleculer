/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const _ 			= require("lodash");
const micromatch  	= require("micromatch");
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

		if (this.opts.ttl) {
			this.timer = setInterval(() => {
				/* istanbul ignore next */
				this.checkTTL();
			}, 30 * 1000);

			this.timer.unref();
		}
		
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
		this.logger.debug(`CLEAN ${match}`);

		this.cache.keys.forEach((key) => {
			if (micromatch.isMatch(key, match))
				this.del(key);
		});

		return Promise.resolve();
	}

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
	}

	/**
	 * Create a wrapped action handler which handle caching functions
	 * 
	 * @param {any} action
	 * @returns
	 */
	wrapHandler(action, handler) {
		return (ctx) => {
			const cacheKey = this.getCacheKey(action.name, ctx.params);

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

	/**
	 * Check & remove the expired cache items
	 * 
	 * @memberOf MemoryMapCacher
	 */
	checkTTL() {
		let self = this;
		let now = Date.now();
		this.cache.keys.forEach((key) => {
			let item = this.cache.get(key);

			if (item.expire && item.expire < now) {
				this.logger.debug(`EXPIRED ${key}`);
				self.cache.delete(key);
			}
		});
	}


		
}

module.exports = Cacher;
