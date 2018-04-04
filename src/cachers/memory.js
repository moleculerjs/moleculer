/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise 		= require("bluebird");
const utils			= require("../utils");
const BaseCacher  	= require("./base");
/**
 * Cacher factory for memory cache
 *
 * @class MemoryCacher
 */
class MemoryCacher extends BaseCacher {

	/**
	 * Creates an instance of MemoryCacher.
	 *
	 * @param {object} opts
	 *
	 * @memberof MemoryCacher
	 */
	constructor(opts) {
		super(opts);

		// Cache container
		this.cache = new Map();

		// Start TTL timer
		this.timer = setInterval(() => {
			/* istanbul ignore next */
			this.checkTTL();
		}, 30 * 1000);

		this.timer.unref();
	}

	/**
	 * Initialize cacher
	 *
	 * @param {any} broker
	 *
	 * @memberof Cacher
	 */
	init(broker) {
		super.init(broker);

		broker.localBus.on("$transporter.connected", () => {
			// Clear all entries after transporter connected. Maybe we missed some "cache.clear" events.
			this.clean();
		});
	}

	/**
	 * Get data from cache by key
	 *
	 * @param {any} key
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
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
	 * @param {String} key
	 * @param {any} data JSON object
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
	 */
	set(key, data, ttl) {
		if (ttl == null)
			ttl = this.opts.ttl;

		this.cache.set(key, {
			data,
			expire: ttl ? Date.now() + ttl * 1000 : null
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
	 * @memberof MemoryCacher
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
	 * @memberof Cacher
	 */
	clean(match = "**") {
		this.logger.debug(`CLEAN ${match}`);

		this.cache.forEach((value, key) => {
			if (utils.match(key, match)) {
				this.logger.debug(`REMOVE ${key}`);
				this.cache.delete(key);
			}
		});

		return Promise.resolve();
	}

	/**
	 * Check & remove the expired cache items
	 *
	 * @memberof MemoryCacher
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

module.exports = MemoryCacher;
