/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise		= require("bluebird");
const isObject 		= require("lodash/isObject");
const BaseCacher 	= require("./base");

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
	 * @memberOf RedisCacher
	 */
	constructor(opts) {
		super(opts);
	}

	/**
	 * Initialize cacher. Connect to Redis server
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf RedisCacher
	 */
	init(broker) {
		super.init(broker);

		let Redis;
		try {
			Redis = require("ioredis");
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'ioredis' package is missing! Please install it with 'npm install ioredis --save' command!", err, true);
		}

		this.client = new Redis(this.opts.redis);
		this.client.on("connect", () => {
			/* istanbul ignore next */
			this.logger.info("Redis cacher connected!");
		});

		this.client.on("error", (err) => {
			/* istanbul ignore next */
			this.logger.error(err);
		});

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
	 * @memberOf RedisCacher
	 */
	close() {
		this.client.quit();
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
		this.logger.debug(`Get ${key}`);
		return this.client.get(this.prefix + key).then((data) => {
			if (data) {
				this.logger.debug(`Found ${key}`);
				try {
					return JSON.parse(data);
				} catch (err) {
					this.logger.error("Redis result parse error!", err);
				}
			}
			return null;
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
		if (isObject(data)) {
			data = JSON.stringify(data);
		}
		this.logger.debug(`Set ${key}`);

		if (this.opts.ttl) {
			return this.client.setex(this.prefix + key, this.opts.ttl, data);/*, (err) => {
				if (err)
					this.logger.error("Redis `setex` error!", err);
			});*/
		} else {
			return this.client.set(this.prefix + key, data);/*, (err) => {
				if (err)
					this.logger.error("Redis `set` error!", err);
			});*/
		}
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
		this.logger.debug(`Delete ${key}`);
		return this.client.del(this.prefix + key).catch((err) => {
			/* istanbul ignore next */
			this.logger.error("Redis `del` error!", err);
		});
	}

	/**
	 * Clean cache. Remove every key by prefix
	 * 		http://stackoverflow.com/questions/4006324/how-to-atomically-delete-keys-matching-a-pattern-using-redis
	 * alternative solution:
	 * 		https://github.com/cayasso/cacheman-redis/blob/master/lib/index.js#L125
	 * @param {any} match Match string for SCAN. Default is "*"
	 * @returns {Promise}
	 * 
	 * @memberOf Cacher
	 */
	clean(match = "*") {
		this.logger.debug(`CLEAN ${this.prefix}${match}`);
		let self = this;
		let scanDel = function (cursor, cb) {
			/* istanbul ignore next */
			self.client.scan(cursor, "MATCH", self.prefix + match.replace(/\*\*/g, "*"), "COUNT", 100, function (err, resp) {
				if (err) {
					return cb(err);
				}
				let nextCursor = parseInt(resp[0]);
				let keys = resp[1];
				// no next cursor and no keys to delete
				if (!nextCursor && !keys.length) {
					return cb(null);
				}

				self.client.del(keys, function (err) {
					if (err) {
						return cb(err);
					}
					if (!nextCursor) {
						return cb(null);
					}
					scanDel(nextCursor, cb);
				});
			});
		};

		scanDel(0, (err) => {
			/* istanbul ignore next */
			if (err) {
				this.logger.error("Redis `scanDel` error!", err);
			}
		});

		return Promise.resolve();
	}

}
module.exports = RedisCacher;
