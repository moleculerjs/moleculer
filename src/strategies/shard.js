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

/**
 * Sharding invocation strategy
 *
 * Using consistent-hashing. More info: https://www.toptal.com/big-data/consistent-hashing
 *
 * @class ShardStrategy
 */
class ShardStrategy extends BaseStrategy {

	constructor(registry, broker) {
		super(registry, broker);

		this.opts = _.defaultsDeep(registry.opts.strategyOptions, {
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

		broker.localBus.on("$node.**", () => this.needRebuild = true);
	}

	/**
	 * Get key field value from Context.
	 *
	 * @param {Context} ctx
	 * @returns {any}
	 * @memberof ShardStrategy
	 */
	getKeyFromContext(ctx) {
		if (!this.opts.shardKey)  return null;

		if (_.isFunction(this.opts.shardKey))
			return this.opts.shardKey.call(this, ctx);

		if (this.opts.shardKey.startsWith("#"))
			return _.get(ctx.meta, this.opts.shardKey.slice(1));

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
		let key = this.getKeyFromContext(ctx);
		if (key != null) {
			if (this.needRebuild)
				this.rebuild(list);

			const hash = this.getHash(key.toString());

			const nodeID = this.getNodeIDByKey(hash);
			if (nodeID)
				return list.find(ep => ep.id == nodeID);
		}

		// Return a random item (no key)
		return list[_.random(0, list.length - 1)];
	}

	/**
	 * Get nodeID by a hashed numeric key.
	 *
	 * @param {Number} key
	 * @returns {String}
	 * @memberof ShardStrategy
	 */
	getNodeIDByKey(key) {
		const cached = this.cache.get(key);
		if (cached) return cached;

		let found = this.ring.find(o => key < o.key);
		if (!found && this.ring.length > 0) {
			found = this.ring[this.ring.length - 1];
		}

		if (found) {
			this.cache.set(key, found.nodeID);
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
		const hashNum = parseInt(hash.substring(0,8), 16);
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

		const arr = list
			.map(ep => ep.id)
			.sort();

		const total = arr.length * this.opts.vnodes;
		const ringSize = this.opts.ringSize ? this.opts.ringSize : Math.pow(2, 32);
		const slice = Math.floor(ringSize / total);

		for (let j = 0; j < this.opts.vnodes; j++) {
			for (let i = 0; i < arr.length; i++) {
				const nodeID = arr[i];
				this.ring.push({
					key: slice * (this.ring.length + 1),
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
