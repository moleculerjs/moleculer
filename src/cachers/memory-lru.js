/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 			= require("lodash");
const utils			= require("../utils");
const BaseCacher  	= require("./base");
const LRU 			= require("lru-cache");
const { METRIC }	= require("../metrics");

const Lock = require("../lock");
/**
 * Cacher factory for memory cache
 *
 * @class MemoryLRUCacher
 */
class MemoryLRUCacher extends BaseCacher {

	/**
	 * Creates an instance of MemoryLRUCacher.
	 *
	 * @param {object} opts
	 *
	 * @memberof MemoryLRUCacher
	 */
	constructor(opts) {
		super(opts);

		// Cache container
		this.cache = new LRU({
			max: this.opts.max,
			maxAge: this.opts.ttl ? this.opts.ttl * 1000 : null,
			updateAgeOnGet: !!this.opts.ttl
		});
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
	 * @memberof MemoryLRUCacher
	 */
	init(broker) {
		super.init(broker);

		broker.localBus.on("$transporter.connected", () => {
			// Clear all entries after transporter connected. Maybe we missed some "cache.clear" events.
			return this.clean();
		});
		if(this.opts.lock && this.opts.lock.enabled !== false && this.opts.lock.staleTime){
			/* istanbul ignore next */
			this.logger.warn("setting lock.staleTime with MemoryLRUCacher is not supported.");
		}
	}

	/**
	 * Close cacher
	 *
	 * @memberof MemoryLRUCacher
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
	 * @memberof MemoryLRUCacher
	 */
	get(key) {
		this.logger.debug(`GET ${key}`);
		this.metrics.increment(METRIC.MOLECULER_CACHER_GET_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_GET_TIME);

		if (this.cache.has(key)) {
			this.logger.debug(`FOUND ${key}`);
			this.metrics.increment(METRIC.MOLECULER_CACHER_FOUND_TOTAL);

			let item = this.cache.get(key);
			const res = this.clone ? this.clone(item) : item;
			timeEnd();

			return this.broker.Promise.resolve(res);
		} else {
			timeEnd();
		}
		return this.broker.Promise.resolve(null);
	}

	/**
	 * Save data to cache by key
	 *
	 * @param {String} key
	 * @param {any} data JSON object
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof MemoryLRUCacher
	 */
	set(key, data, ttl) {
		this.metrics.increment(METRIC.MOLECULER_CACHER_SET_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_SET_TIME);

		if (ttl == null)
			ttl = this.opts.ttl;

		this.cache.set(key, data, ttl ? ttl * 1000 : null);

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
	 * @memberof MemoryLRUCacher
	 */
	del(keys) {
		this.metrics.increment(METRIC.MOLECULER_CACHER_DEL_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_DEL_TIME);

		keys = Array.isArray(keys) ? keys : [keys];
		keys.forEach(key => {
			this.cache.del(key);
			this.logger.debug(`REMOVE ${key}`);
		});
		timeEnd();

		return this.broker.Promise.resolve();
	}

	/**
	 * Clean cache. Remove every key by match
	 * @param {string|Array<string>} match string. Default is "**"
	 * @returns {Promise}
	 *
	 * @memberof MemoryLRUCacher
	 */
	clean(match = "**") {
		this.metrics.increment(METRIC.MOLECULER_CACHER_CLEAN_TOTAL);
		const timeEnd = this.metrics.timer(METRIC.MOLECULER_CACHER_CLEAN_TIME);

		const matches = Array.isArray(match) ? match : [match];
		this.logger.debug(`CLEAN ${matches.join(", ")}`);

		this.cache.keys().forEach(key => {
			if (matches.some(match => utils.match(key, match))) {
				this.logger.debug(`REMOVE ${key}`);
				this.cache.del(key);
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
	 * @memberof MemoryLRUCacher
	 */
	getWithTTL(key){
		// There are no way to get the ttl of LRU cache :(
		return this.get(key).then(data=>{
			return { data, ttl: null };
		});
	}

	/**
	 * Acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof MemoryLRUCacher
	 */

	lock(key, ttl) {
		return this._lock.acquire(key, ttl).then(()=> {
			return ()=>this._lock.release(key);
		});
	}

	/**
	 * Try to acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof MemoryLRUCacher
	 */
	tryLock(key, ttl) {
		if(this._lock.isLocked(key)){
			return this.broker.Promise.reject(new Error("Locked."));
		}
		return this._lock.acquire(key, ttl).then(()=> {
			return ()=>this._lock.release(key);
		});
	}


	/**
	 * Check & remove the expired cache items
	 *
	 * @memberof MemoryLRUCacher
	 */
	checkTTL() {
		this.cache.prune();
	}
}

module.exports = MemoryLRUCacher;
