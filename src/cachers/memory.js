/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise 		= require("bluebird");
const nanomatch  	= require("nanomatch");
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
	 * @memberOf MemoryMapCacher
	 */
	get(key) {
		this.logger.debug(`GET ${key}`);

		if (this.cache.has(key)) {
			this.logger.debug(`FOUND ${key}`);

			let item = this.cache.get(key);

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
		this.logger.debug(`REMOVE ${key}`);
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

		this.cache.forEach((value, key) => {
			if (nanomatch.isMatch(key, match)) {
				this.logger.debug(`REMOVE ${key}`);
				this.cache.delete(key);
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
		let now = Date.now();
		this.cache.forEach((value, key) => {
			let item = this.cache.get(key);

			if (item.expire && item.expire < now) {
				this.logger.debug(`EXPIRED ${key}`);
				this.cache.delete(key);
			}
		});
	}
}

module.exports = MemoryMapCacher;
