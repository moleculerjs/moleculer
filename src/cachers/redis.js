/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const BaseCacher = require("./base");

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
	constructor (opts) {
		if (typeof opts == "string")
			opts = {redis: opts};

		super(opts);
	}

	/**
	 * Initialize cacher. Connect to Redis server
	 *
	 * @param {any} broker
	 *
	 * @memberof RedisCacher
	 */
	init (broker) {
		super.init(broker);

		let Redis;
		try {
			Redis = require("ioredis");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'ioredis' package is missing. Please install it with 'npm install ioredis --save' command.", err, true);
		}

		this.client = new Redis(this.opts.redis);
		this.client.on("connect", () => {
			/* istanbul ignore next */
			this.logger.info("Redis cacher connected.");
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
	 * @memberof RedisCacher
	 */
	close () {
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
	get (key) {
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
	set (key, data, ttl) {
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
	 * @param {any} deleteTargets
	 * @returns {Promise}
	 *
	 * @memberof Cacher
	 */
	del (deleteTargets) {
		deleteTargets = Array.isArray(deleteTargets) ? deleteTargets : [deleteTargets];
		const keysToDelete = deleteTargets.map(key => this.prefix + key);
		this.logger.debug(`DELETE ${keysToDelete}`);
		return this.client.del(keysToDelete).catch(err => {
			/* istanbul ignore next */
			this.logger.error("Redis `del` error.", key, err);
		});
	}

	/**
	 * Clean cache. Remove every key by prefix
	 *        http://stackoverflow.com/questions/4006324/how-to-atomically-delete-keys-matching-a-pattern-using-redis
	 * alternative solution:
	 *        https://github.com/cayasso/cacheman-redis/blob/master/lib/index.js#L125
	 * @param {any} match Match string for SCAN. Default is "*"
	 * @returns {Promise}
	 *
	 * @memberof Cacher
	 */
	async clean (match = "*") {
		const cleaningPatterns = Array.isArray(match) ? match : [match];
		const normalizedPatters = cleaningPatterns.map(match => this.prefix + match.replace(/\*\*/g, "*"));
		this.logger.debug(`CLEAN ${match}`);
		/* istanbul ignore next */

		for (let index = 0; index < normalizedPatters.length; index++) {
			const pattern = normalizedPatters[index];
			try {
				await this._scanDel(pattern);
			} catch (err) {
				this.logger.error("Redis `scanDel` error.", pattern, err);
				throw err;
			}
		}

	}

	_scanDel (match) {
		return new Promise((resolve, reject) => {
			const stream = this.client.scanStream({
				match,
				count: 100
			});
			stream.on("data", async (keys) => {
				stream.pause();
				try {
					await this.client.del(keys);
				} catch (err) {
					reject(err);
				}
				stream.resume();
			});
			stream.on("end", () => {
				resolve();
			});
		});
	}
}

module.exports = RedisCacher;
