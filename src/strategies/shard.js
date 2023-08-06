/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const BaseStrategy = require("./base");
const crypto = require("crypto");
const LRU = require("lru-cache");
const { isFunction, randomInt } = require("../utils");

/**
 * Sharding invocation strategy
 *
 * Using consistent-hashing. More info: https://www.toptal.com/big-data/consistent-hashing
 *
 * @class ShardStrategy
 */
class ShardStrategy extends BaseStrategy {
	constructor(registry, broker, opts) {
		super(registry, broker, opts);

		this.opts = _.defaultsDeep(opts, {
			shardKey: null,
			vnodes: 10,
			ringSize: null,
			cacheSize: 1000
		});

		this.cache = new LRU({
			max: this.opts.cacheSize,
			maxAge: null
		});

		this.needRebuild = true;
		this.ring = [];

		broker.localBus.on("$node.**", () => (this.needRebuild = true));
	}

	/**
	 * Get key field value from Context.
	 *
	 * @param {Context} ctx
	 * @returns {any}
	 * @memberof ShardStrategy
	 */
	getKeyFromContext(ctx) {
		if (!this.opts.shardKey) return null;

		if (isFunction(this.opts.shardKey)) return this.opts.shardKey.call(this, ctx);

		if (this.opts.shardKey.startsWith("#")) return _.get(ctx.meta, this.opts.shardKey.slice(1));

		return _.get(ctx.params, this.opts.shardKey);
	}

	/**
	 * Select an endpoint by sharding.
	 *
	 * @param {Array<Endpoint>} list
	 * @param {Context} ctx
	 * @returns {Endpoint}
	 * @memberof ShardStrategy
	 */
	select(list, ctx) {
		const key = this.getKeyFromContext(ctx);

		if (key != null) {
			if (this.needRebuild) this.rebuild(list);

			const nodeID = this.getNodeIDByKey(key);
			if (nodeID) return list.find(ep => ep.id == nodeID);
		}

		// Return a random item (no key)
		return list[randomInt(0, list.length - 1)];
	}

	/**
	 * Get nodeID by a hashed numeric key.
	 *
	 * @param {Number} key
	 * @returns {String}
	 * @memberof ShardStrategy
	 */
	getNodeIDByKey(key) {
		if (this.cache) {
			const cached = this.cache.get(key);
			if (cached) return cached;
		}

		const hashNum = this.getHash(key.toString());

		let found;
		const ringLen = this.ring.length;
		for (let i = 0; i < ringLen; i++) {
			if (hashNum <= this.ring[i].key) {
				found = this.ring[i];
				break;
			}
		}

		if (found) {
			if (this.cache) this.cache.set(key, found.nodeID);
			return found.nodeID;
		}
		return null;
	}

	/**
	 * Calculate 8 bit integer hash from string key based on MD5 hash.
	 *
	 * @param {String} key
	 * @returns {Number}
	 * @memberof ShardStrategy
	 */
	getHash(key) {
		const hash = crypto.createHash("md5").update(key).digest("hex");
		const hashNum = parseInt(hash.substring(0, 8), 16);
		return this.opts.ringSize ? hashNum % this.opts.ringSize : hashNum;
	}

	/**
	 * Rebuild the node hashring.
	 *
	 * @param {Array<Endpoint>} list
	 * @memberof ShardStrategy
	 */
	rebuild(list) {
		this.cache.reset();
		this.ring = [];

		const arr = list.map(ep => ep.id).sort();

		const total = arr.length * this.opts.vnodes;
		const ringSize = this.opts.ringSize ? this.opts.ringSize : Math.pow(2, 32);
		const slice = ringSize / total;

		for (let j = 0; j < this.opts.vnodes; j++) {
			for (let i = 0; i < arr.length; i++) {
				const nodeID = arr[i];
				this.ring.push({
					key: Math.floor(slice * (this.ring.length + 1)),
					nodeID: nodeID
				});
			}
		}

		// Set the latest value to the last slice.
		this.ring[this.ring.length - 1].key = ringSize;

		this.needRebuild = false;
	}
}

module.exports = ShardStrategy;
