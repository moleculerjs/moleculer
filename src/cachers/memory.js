"use strict";

let _ 			= require("lodash");
let BaseCacher  = require("./base");
/**
 * Cacher factory for memory cache
 * 
 * 		Similar: https://github.com/mpneuried/nodecache/blob/master/_src/lib/node_cache.coffee
 * 
 * @class Cacher
 */
class MemoryCacher extends BaseCacher {

	/**
	 * Creates an instance of Cacher.
	 * 
	 * @param {object} opts
	 * 
	 * @memberOf Cacher
	 */
	constructor(opts) {
		super(opts);
		
		// Cache container
		this.cache = {};

		if (this.opts.ttl) {
			this.timer = setInterval(() => {
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
		return new Promise((resolve, reject) => {
			let item = this.cache[this.prefix + key];
			if (item) { 
				this.logger.debug(`GET ${this.prefix}${key}`);
				resolve(item.data);
				// Update expire time (hold in the cache if we are using it)
				item.expire = Date.now() + this.opts.ttl * 1000;
			}
			else 
				resolve(null);
		});
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
		this.cache[this.prefix + key] = {
			data: data,
			expire: Date.now() + this.opts.ttl * 1000
		};
		this.logger.debug(`SET ${this.prefix}${key}`);
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
		delete this.cache[this.prefix + key];
		this.logger.debug(`DEL ${this.prefix}${key}`);
		return Promise.resolve();
	}

	/**
	 * Clean cache. Remove every key by prefix
	 * @param {any} match Match string for SCAN. Default is "*"
	 * @returns {Promise}
	 * 
	 * @memberOf Cacher
	 */
	clean(match) {
		// TODO: match not supported yet
		this.logger.debug(`CLEAR ${this.prefix}*`);
		this.cache = {};
		return Promise.resolve();
	}

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
