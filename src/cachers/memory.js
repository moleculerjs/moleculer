/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const micromatch  	= require("micromatch");
const BaseCacher  	= require("./base");
/**
 * Cacher factory for memory cache
 * 
 * 		Similar: https://github.com/mpneuried/nodecache/blob/master/_src/lib/node_cache.coffee
 * 
 * @class MemoryCacher
 */
class MemoryCacher extends BaseCacher {

	/**
	 * Creates an instance of MemoryCacher.
	 * 
	 * @param {object} opts
	 * 
	 * @memberOf MemoryCacher
	 */
	constructor(opts) {
		super(opts);
		
		// Cache container
		this.cache = {};

		if (this.opts.ttl) {
			this.timer = setInterval(() => {
				/* istanbul ignore next */
				this.checkTTL();
			}, 30 * 1000);

			this.timer.unref();
		}
	}

	/**
	 * Get data from cache by key
	 * 
	 * @param {any} key
	 * @returns {Promise}
	 *  
	 * @memberOf Cacher
	 */
	get(key) {
		//this.logger.debug(`Get ${key}`);
		let item = this.cache[key];
		if (item) { 
			//this.logger.debug(`Found ${key}`);

			if (this.opts.ttl) {
				// Update expire time (hold in the cache if we are using it)
				item.expire = Date.now() + this.opts.ttl * 1000;
			}
			return Promise.resolve(item.data);
		}
		return Promise.resolve(null);
	}

	/**
	 * Save data to cache by key
	 * 
	 * @param {any} key
	 * @param {any} data JSON object
	 * @returns {Promise}
	 * 
	 * @memberOf Cacher
	 */
	set(key, data) {
		this.cache[key] = {
			data,
			expire: this.opts.ttl ? Date.now() + this.opts.ttl * 1000 : null
		};
		this.logger.debug(`Set ${key}`);
		return Promise.resolve(data);
	}

	/**
	 * Delete a key from cache
	 * 
	 * @param {any} key
	 * @returns {Promise}
	 * 
	 * @memberOf Cacher
	 */
	del(key) {
		delete this.cache[key];
		this.logger.debug(`Delete ${key}`);
		return Promise.resolve();
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

		let keys = Object.keys(this.cache);
		keys.forEach((key) => {
			if (micromatch.isMatch(key, match)) {
				this.logger.debug(`REMOVE ${key}`);
				delete this.cache[key];
			}
		});

		return Promise.resolve();
	}


	/**
	 * Check & remove the expired cache items
	 * 
	 * @memberOf MemoryMapCacher
	 */
	checkTTL() {
		let self = this;
		let now = Date.now();
		let keys = Object.keys(this.cache);
		keys.forEach((key) => {
			let item = this.cache[key];

			if (item.expire && item.expire < now) {
				this.logger.debug(`EXPIRED ${key}`);
				delete self.cache[key];
			}
		});
	}	
}

module.exports = MemoryCacher;