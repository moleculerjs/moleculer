/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const BaseCacher = require("./base");
const _ = require('lodash')
/**
 * Cacher factory for Redis
 *
 * @class RedisCacher
 */
class RedisCacher extends BaseCacher {

	/**
	 * Creates an instance of RedisCacher.
	 *
	 * @param {object} opts
	 *
	 * @memberof RedisCacher
	 */
	constructor(opts) {
		if (typeof opts === "string")
			opts = { redis: opts };

		super(opts);
	}

	/**
	 * Initialize cacher. Connect to Redis server
	 *
	 * @param {any} broker
	 *
	 * @memberof RedisCacher
	 */
	init(broker) {
		super.init(broker);
		let Redis, Redlock;
		try {
			Redis = require("ioredis");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'ioredis' package is missing. Please install it with 'npm install ioredis --save' command.", err, true);
		}
		/**
		 * ioredis client instance
		 * @memberof RedisCacher
		 */
		this.client = new Redis(this.opts.redis);
		this.client.on("connect", () => {
			/* istanbul ignore next */
			this.logger.info("Redis cacher connected.");
		});

		this.client.on("error", (err) => {
			/* istanbul ignore next */
			this.logger.error(err);
		});
		if (this.opts.lock && this.opts.lock.enabled !== false) {
			try {
				Redlock = require('redlock');
			} catch (err) {
				/* istanbul ignore next */
				this.broker.fatal("The 'redlock' package is missing. Please install it with 'npm install redlock --save' command.", err, true);
			}

			let redlockClients = (this.opts.redlock ? this.opts.redlock.clients : null) || [this.client]
			/**
			 * redlock client instance
			 * @memberof RedisCacher
			 */
			this.redlock = new Redlock(
				redlockClients,
				_.omit(this.opts.redlock, ['clients'])
			);
			// Non-blocking redlock client, used for tryLock()
			this.redlockNonBlocking = new Redlock(
				redlockClients,
				{
					retryCount: 0
				}
			)
		}
		if (this.opts.monitor) {
			/* istanbul ignore next */
			this.client.monitor((err, monitor) => {
				this.logger.debug("Redis cacher entering monitoring mode...");
				monitor.on("monitor", (time, args/*, source, database*/) => {
					this.logger.debug(args);
				});
			});
		}

		this.logger.debug("Redis Cacher created. Prefix: " + this.prefix);
	}

	/**
	 * Close Redis client connection
	 *
	 * @memberof RedisCacher
	 */
	close() {
		return this.client.quit();
	}

	/**
	 * Get data from cache by key
	 *
	 * @param {any} key
	 * @returns {Promise}
	 *
	 * @memberof Cacher
	 */
	get(key) {
		this.logger.debug(`GET ${key}`);
		return this.client.get(this.prefix + key).then((data) => {
			if (data) {
				this.logger.debug(`FOUND ${key}`);
				try {
					return JSON.parse(data);
				} catch (err) {
					this.logger.error("Redis result parse error.", err, data);
				}
			}
			return null;
		});
	}

	/**
	 * Save data to cache by key
	 *
	 * @param {String} key
	 * @param {any} data JSON object
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof Cacher
	 */
	set(key, data, ttl) {
		data = JSON.stringify(data);
		this.logger.debug(`SET ${key}`);

		if (ttl == null)
			ttl = this.opts.ttl;

		if (ttl) {
			return this.client.setex(this.prefix + key, ttl, data);
		} else {
			return this.client.set(this.prefix + key, data);
		}
	}

	/**
	 * Delete a key from cache
	 *
	 * @param {string|Array<string>} deleteTargets
	 * @returns {Promise}
	 *
	 * @memberof Cacher
	 */
	del(deleteTargets) {
		deleteTargets = Array.isArray(deleteTargets) ? deleteTargets : [deleteTargets];
		const keysToDelete = deleteTargets.map(key => this.prefix + key);
		this.logger.debug(`DELETE ${keysToDelete}`);
		return this.client.del(keysToDelete).catch(err => {
			this.logger.error(`Redis 'del' error. Key: ${keysToDelete}`, err);
			throw err;
		});
	}

	/**
	 * Clean cache. Remove every key by prefix
	 *        http://stackoverflow.com/questions/4006324/how-to-atomically-delete-keys-matching-a-pattern-using-redis
	 * alternative solution:
	 *        https://github.com/cayasso/cacheman-redis/blob/master/lib/index.js#L125
	 * @param {String|Array<String>} match Match string for SCAN. Default is "*"
	 * @returns {Promise}
	 *
	 * @memberof Cacher
	 */
	clean(match = "*") {
		const cleaningPatterns = Array.isArray(match) ? match : [match];
		const normalizedPatterns = cleaningPatterns.map(match => this.prefix + match.replace(/\*\*/g, "*"));
		this.logger.debug(`CLEAN ${match}`);
		return this._sequentialPromises(normalizedPatterns)
			.catch((err) => {
				this.logger.error(`Redis 'scanDel' error. Pattern: ${err.pattern}`, err);
				throw err;
			});

	}

	/**
	 * Get data and ttl from cache by key.
	 *
	 * @param {string|Array<string>} key
	 * @returns {Promise}
	 *
	 * @memberof RedisCacher
	 */

	dogpile(key) {
		return this.client.pipeline().get(this.prefix + key).ttl(this.prefix + key).exec().then((res) => {
			let [err0, data] = res[0]
			let [err1, ttl] = res[1]
			if(err0){
				return Promise.reject(err0)
			}
			if(err1){
				return Promise.reject(err1)
			}
			if (data) {
				this.logger.debug(`FOUND ${key}`);
				try {
					data = JSON.parse(data);
				} catch (err) {
					this.logger.error("Redis result parse error.", err, data);
					data = null
				}
			}
			return { data, ttl }
		});
	}


	/**
	 * Acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof RedisCacher
	 */
	lock(key, ttl=15000) {
		key = this.prefix + key + "-lock"
		return this.redlock.lock(key, ttl).then(lock=>{
			return ()=>lock.unlock()
		})
	}

	/**
	 * Try to acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {Number} ttl Optional Time-to-Live
	 * @returns {Promise}
	 *
	 * @memberof RedisCacher
	 */
	tryLock(key, ttl=15000) {
		key = this.prefix + key + "-lock"
		return this.redlockNonBlocking.lock(key, ttl).then(lock=>{
			return ()=>lock.unlock()
		})
	}

	_sequentialPromises(elements) {
		return elements.reduce((chain, element) => {
			return chain.then(() => this._scanDel(element));
		}, Promise.resolve());
	}

	_scanDel(pattern) {
		return new Promise((resolve, reject) => {
			const stream = this.client.scanStream({
				match: pattern,
				count: 100
			});
			stream.on("data", (keys = []) => {
				if (!keys.length) {
					return;
				}

				stream.pause();
				this.client.del(keys)
					.then(() => {
						stream.resume();
					})
					.catch((err) => {
						err.pattern = pattern;
						return reject(err);
					});
			});
			stream.on("end", () => {
				resolve();
			});
		});
	}
}

module.exports = RedisCacher;
