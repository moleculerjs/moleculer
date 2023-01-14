/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const utils = require("../utils");
const BaseCacher = require("./base");
const { METRIC } = require("../metrics");

const Lock = require("../lock");

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
		// Async lock
		this._lock = new Lock();
		// Start TTL timer
		this.timer = setInterval(() => {
			/* istanbul ignore next */
			this.checkTTL();
		}, 30 * 1000);
		this.timer.unref();

		// Set cloning
		this.clone = this.opts.clone === true ? _.cloneDeep : this.opts.clone;
	}

	/**
	 * Initialize cacher
	 *
	 * @param {any} broker
	 *
	 * @memberof MemoryCacher
	 */
	init(broker) {
		super.init(broker);

		this.connected = true;

		broker.localBus.on("$transporter.connected", () => {
			// Clear all entries after transporter connected. Maybe we missed some "cache.clear" events.
			return this.clean();
		});
	}

	/**
	 * Close cacher
	 *
	 * @memberof MemoryCacher
	 */
	close() {
		clearInterval(this.timer);
		return Promise.resolve();
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
		this.metrics.increment(METRIC.MOLECULER_CACHER_GET_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_GET_TIME);

		if (this.cache.has(key)) {
			this.logger.debug(`FOUND ${key}`);
			this.metrics.increment(METRIC.MOLECULER_CACHER_FOUND_TOTAL);

			let item = this.cache.get(key);
			if (item.expire && item.expire < Date.now()) {
				this.logger.debug(`EXPIRED ${key}`);
				this.metrics.increment(METRIC.MOLECULER_CACHER_EXPIRED_TOTAL);
				this.cache.delete(key);
				timeEnd();
				return this.broker.Promise.resolve(this.opts.missingResponse);
			}
			const res = this.clone ? this.clone(item.data) : item.data;
			timeEnd();

			return this.broker.Promise.resolve(res);
		} else {
			timeEnd();
		}
		return this.broker.Promise.resolve(this.opts.missingResponse);
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
		this.metrics.increment(METRIC.MOLECULER_CACHER_SET_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_SET_TIME);

		if (ttl == null) ttl = this.opts.ttl;

		data = this.clone ? this.clone(data) : data;

		this.cache.set(key, {
			data,
			expire: ttl ? Date.now() + ttl * 1000 : null
		});

		timeEnd();
		this.logger.debug(`SET ${key}`);

		return this.broker.Promise.resolve(data);
	}

	/**
	 * Delete a key from cache
	 *
	 * @param {string|Array<string>} key
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
	 */
	del(keys) {
		this.metrics.increment(METRIC.MOLECULER_CACHER_DEL_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_DEL_TIME);

		keys = Array.isArray(keys) ? keys : [keys];
		keys.forEach(key => {
			this.cache.delete(key);
			this.logger.debug(`REMOVE ${key}`);
		});
		timeEnd();

		return this.broker.Promise.resolve();
	}

	/**
	 * Clean cache. Remove every key by match
	 *
	 * @param {string|Array<string>} match string. Default is "**"
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
	 */
	clean(match = "**") {
		this.metrics.increment(METRIC.MOLECULER_CACHER_CLEAN_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_CLEAN_TIME);

		const matches = Array.isArray(match) ? match : [match];
		this.logger.debug(`CLEAN ${matches.join(", ")}`);

		this.cache.forEach((value, key) => {
			if (matches.some(match => utils.match(key, match))) {
				this.logger.debug(`REMOVE ${key}`);
				this.cache.delete(key);
			}
		});
		timeEnd();

		return this.broker.Promise.resolve();
	}

	/**
	 * Get data and ttl from cache by key.
	 *
	 * @param {string|Array<string>} key
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
	 */
	getWithTTL(key) {
		this.logger.debug(`GET ${key}`);
		let data = this.opts.missingResponse;
		let ttl = null;
		if (this.cache.has(key)) {
			this.logger.debug(`FOUND ${key}`);

			let item = this.cache.get(key);
			let now = Date.now();
			ttl = (item.expire - now) / 1000;
			ttl = ttl > 0 ? ttl : null;
			if (this.opts.ttl) {
				// Update expire time (hold in the cache if we are using it)
				item.expire = now + this.opts.ttl * 1000;
			}
			data = this.clone ? this.clone(item.data) : item.data;
		}
		return this.broker.Promise.resolve({ data, ttl });
	}

	/**
	 * Acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
	 */
	lock(key, ttl) {
		return this._lock.acquire(key, ttl).then(() => {
			return () => this._lock.release(key);
		});
	}

	/**
	 * Try to acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof MemoryCacher
	 */
	tryLock(key, ttl) {
		if (this._lock.isLocked(key)) {
			return this.broker.Promise.reject(new Error("Locked."));
		}
		return this._lock.acquire(key, ttl).then(() => {
			return () => this._lock.release(key);
		});
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
				this.metrics.increment(METRIC.MOLECULER_CACHER_EXPIRED_TOTAL);
				this.cache.delete(key);
			}
		});
	}

	/**
	 * Return all cache keys with available properties (ttl, lastUsed, ...etc).
	 *
	 * @returns Promise<Array<Object>>
	 */
	getCacheKeys() {
		return Promise.resolve(
			Array.from(this.cache.entries()).map(([key, item]) => {
				return {
					key,
					expiresAt: item.expire
				};
			})
		);
	}
}

module.exports = MemoryCacher;
