/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

//const Promise 	= require("bluebird");
const defaultsDeep 	= require("lodash/defaultsDeep");
const isArray 		= require("lodash/isArray");
const { hash } 		= require("node-object-hash")({ sort: false, coerce: false});

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
		this.opts = defaultsDeep(opts, {
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

			broker.use(this.middleware());

			this.broker.on("cache.clean", payload => {
				if (isArray(payload))
					payload.forEach(match => this.clean(match));
				else
					this.clean(payload);
			});

			this.broker.on("cache.del", payload => {
				if (isArray(payload))
					payload.forEach(key => this.del(key));
				else
					this.del(payload);
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
	get(/*key*/) {
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
	set(/*key, data*/) {
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
	del(/*key*/) {
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
	clean(/*match = "**"*/) {
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
		let parts = [];
		if (name)
			parts.push(name);

		if (params && Object.keys(params).length > 0) {
			if (isArray(keys)) {
				if (keys.length > 0)
					parts.push(keys.map(key => params[key]).join("-"));
			}
			else
				parts.push(hash(params));
		}
		return parts.join(":");
	}

	/**
	 * Register cacher as a middleware
	 * 
	 * @memberOf Cacher
	 */
	middleware() {
		return (handler, action) => {
			if (action.cache) {
				return function cacherMiddleware(ctx) {
					const cacheKey = this.getCacheKey(action.name, ctx.params, action.cache.keys);
					return this.get(cacheKey).then(content => {
						if (content != null) {
							// Found in the cache! Don't call handler, return with the context
							ctx.cachedResult = true;
							return content;
						}

						// Call the handler
						return handler(ctx).then(result => {
							// Save the response to the cache
							this.set(cacheKey, result);
							
							return result;
						});
					});
				}.bind(this);
			}

			return handler;
		};
	}
		
}

module.exports = Cacher;
