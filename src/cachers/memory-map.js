/*
 * ice-services
 * Copyright (c) 2017 Norbert Mereg (https://github.com/icebob/ice-services)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const BaseCacher  	= require("./base");
/**
 * Cacher factory for memory cache
 * 
 * 		Similar: https://github.com/mpneuried/nodecache/blob/master/_src/lib/node_cache.coffee
 * 
 * @class MemoryMapCacher
 */
class MemoryMapCacher extends BaseCacher {

	/**
	 * Creates an instance of MemoryMapCacher.
	 * 
	 * @param {object} opts
	 * 
	 * @memberOf MemoryMapCacher
	 */
	constructor(opts) {
		super(opts);
		
		// Cache container
		this.cache = new Map();
	}

	/**
	 * Get data from cache by key
	 * 
	 * @param {any} key
	 * @returns {Promise}
	 *  
	 * @memberOf MemoryMapCacher
	 */
	get(key) {
		if (this.cache.has(key)) { 
			this.logger.debug(`GET ${key}`);

			let item = this.cache.get(key);

			if (this.opts.ttl) {
				// Update expire time (hold in the cache if we are using it)
				item.expire = Date.now() + this.opts.ttl * 1000;
			}
			return Promise.resolve(item.data);
		}
		return Promise.resolve();
	}

	/**
	 * Save data to cache by key
	 * 
	 * @param {any} key
	 * @param {any} data JSON object
	 * @returns {Promise}
	 * 
	 * @memberOf MemoryMapCacher
	 */
	set(key, data) {
		this.cache.set(key, {
			data,
			expire: this.opts.ttl ? Date.now() + this.opts.ttl * 1000 : null
		});
		this.logger.debug(`SET ${key}`);
		return Promise.resolve(data);
	}

	/**
	 * Delete a key from cache
	 * 
	 * @param {any} key
	 * @returns {Promise}
	 * 
	 * @memberOf MemoryMapCacher
	 */
	del(key) {
		this.cache.delete(key);
		this.logger.debug(`DEL ${key}`);
		return Promise.resolve();
	}

}
module.exports = MemoryMapCacher;
