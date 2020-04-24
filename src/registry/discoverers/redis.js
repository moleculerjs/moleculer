/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { BrokerOptionsError } = require("../../errors");
const BaseDiscoverer = require("./base");
const { METRIC } = require("../../metrics");

let Redis;

/**
 * Redis-based Discoverer class
 *
 * @class RedisDiscoverer
 */
class RedisDiscoverer extends BaseDiscoverer {

	/**
	 * Creates an instance of Discoverer.
	 *
	 * @memberof RedisDiscoverer
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			fullCheck: 10, // Disable with `0` or `null`
			scanLength: 100,
			redis: null,
			monitor: false,
		});

		// Index for full checks
		this.idx = this.opts.fullCheck > 1 ? _.random(this.opts.fullCheck - 1) : 0;

		// Store the online nodes.
		this.nodes = new Map();

		// Redis client instance
		this.client = null;

		// Timer for INFO packets expiration updating
		this.infoUpdateTimer = null;

		// Last local INFO sequence number
		this.lastLocalSeq = 0;
	}

	/**
	 * Initialize Discoverer
	 *
	 * @param {any} registry
	 *
	 * @memberof RedisDiscoverer
	 */
	init(registry) {
		super.init(registry);

		try {
			Redis = require("ioredis");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'ioredis' package is missing. Please install it with 'npm install ioredis --save' command.", err, true);
		}

		this.PREFIX = `MOL${this.broker.namespace ? "-" + this.broker.namespace : ""}-DSCVR`;
		this.BEAT_KEY = `${this.PREFIX}-BEAT:${this.broker.nodeID}|${this.broker.instanceID}`;
		this.INFO_KEY = `${this.PREFIX}-INFO:${this.broker.nodeID}`;

		/**
		 * ioredis client instance
		 * @memberof RedisCacher
		 */
		if (this.opts.cluster) {
			if (!this.opts.cluster.nodes || this.opts.cluster.nodes.length === 0) {
				throw new BrokerOptionsError("No nodes defined for cluster");
			}

			this.client = new Redis.Cluster(this.opts.cluster.nodes, this.opts.cluster.options);
		} else {
			this.client = new Redis(this.opts.redis);
		}

		this.client.on("connect", () => {
			/* istanbul ignore next */
			this.logger.info("Redis Discoverer client connected.");
		});

		this.client.on("reconnecting", () => {
			/* istanbul ignore next */
			this.logger.warn("Redis Discoverer client reconnecting...");
		});

		this.client.on("error", (err) => {
			/* istanbul ignore next */
			this.logger.error(err);
		});

		if (this.opts.monitor) {
			this.client.monitor((err, monitor) => {
				this.logger.debug("Redis Discoverer entering monitoring mode...");
				monitor.on("monitor", (time, args/*, source, database*/) => this.logger.debug(args));
			});
		}

		this.logger.debug("Redis Discoverer created. Prefix:", this.PREFIX);
	}

	/**
	 * Stop discoverer clients.
	 */
	stop() {
		if (this.infoUpdateTimer) clearTimeout(this.infoUpdateTimer);

		return super.stop()
			.then(() => {
				if (this.client)
					return this.client.quit();
			});
	}

	/**
	 * Register Moleculer Transit Core metrics.
	 */
	registerMoleculerMetrics() {
		this.broker.metrics.register({ name: METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TOTAL, type: METRIC.TYPE_COUNTER, rate: true, description: "Number of Service Registry fetching from Redis" });
		this.broker.metrics.register({ name: METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TIME, type: METRIC.TYPE_HISTOGRAM, quantiles: true, unit: METRIC.UNIT_MILLISECONDS, description: "Time of Service Registry fetching from Redis" });
	}

	/**
	 * Recreate the INFO key update timer.
	 */
	recreateInfoUpdateTimer() {
		if (this.infoUpdateTimer) clearTimeout(this.infoUpdateTimer);

		this.infoUpdateTimer = setTimeout(() => {
			// Reset the INFO packet expiry.
			return this.client.expire(this.INFO_KEY + "|" + this.lastLocalSeq, 30 * 60) // 30 mins
				.then(() => this.recreateInfoUpdateTimer());
		}, 20 * 60 * 1000 ); // 20 mins
	}

	/**
	 * Sending a local heartbeat to Redis.
	 */
	sendHeartbeat() {
		//console.log("REDIS - HB 1", localNode.id, this.heartbeatTimer);

		const timeEnd = this.broker.metrics.timer(METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TIME);
		const data = {
			sender: this.broker.nodeID,
			ver: this.broker.PROTOCOL_VERSION,

			timestamp: Date.now(),
			cpu: this.localNode.cpu,
			seq: this.localNode.seq,
			instanceID: this.broker.instanceID
		};

		const key = this.BEAT_KEY + "|" + this.localNode.seq;

		return this.client.setex(key, this.opts.heartbeatTimeout, JSON.stringify(data))
			.then(() => this.collectOnlineNodes())
			.catch(err => this.logger.error("Error occured while scanning Redis keys.", err))
			.then(() => {
				timeEnd();
				this.broker.metrics.increment(METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TOTAL);
			});
	}

	/**
	 * Collect online nodes from Redis server.
	 */
	collectOnlineNodes() {
		//this.logger.warn("----------------------------------------------------");
		// Save the previous state so that we can check the disconnected nodes.
		const prevNodes = new Map(this.nodes);

		// Collect the online node keys.
		return new this.Promise((resolve, reject) => {
			const stream = this.client.scanStream({
				match: `${this.PREFIX}-BEAT:*`,
				count: this.opts.scanLength
			});

			let scannedKeys = [];

			stream.on("data", keys => {
				if (!keys || !keys.length) return;
				scannedKeys = scannedKeys.concat(keys);
			});

			stream.on("error", err => reject(err));
			stream.on("end", () => {
				if (scannedKeys.length == 0) return resolve();

				this.Promise.resolve()
					.then(() => {
						if (this.opts.fullCheck && ++this.idx % this.opts.fullCheck == 0) {
							// Full check
							this.logger.warn("Full check", this.idx);
							this.idx = 0;

							return this.client.mget(...scannedKeys)
								.then(packets => packets.map(raw => {
									try {
										return JSON.parse(raw);
									} catch(err) {
										this.logger.warn("Unable to parse Redis response", err, raw);
									}
								}));
						} else {
							//this.logger.info("Lazy check", this.idx);
							// Lazy check
							return scannedKeys.map(key => {
								const p = key.substring(`${this.PREFIX}-BEAT:`.length).split("|");
								return {
									key,
									sender: p[0],
									instanceID: p[1],
									seq: Number(p[2])
								};
							});
						}
					})
					.then(packets => {
						packets.map(packet => {
							if (packet.sender == this.broker.nodeID) return;

							prevNodes.delete(packet.sender);
							this.nodes.set(packet.sender, packet);
							this.heartbeatReceived(packet.sender, packet);
						});
					})
					.then(() => resolve());
			});

		}).then(() => {
			if (prevNodes.size > 0) {
				//this.logger.warn("Not found nodes", prevNodes.keys());
				// Disconnected nodes
				Array.from(prevNodes.keys()).map(nodeID => {
					this.logger.info(`The node '${nodeID}' is not available. Removing from registry...`);
					this.remoteNodeDisconnected(nodeID, true);
					this.nodes.delete(nodeID);
				});
			}
		});
	}

	/**
	 * Discover a new or old node.
	 *
	 * @param {String} nodeID
	 */
	discoverNode(nodeID) {
		return this.client.get(`${this.PREFIX}-INFO:${nodeID}`)
			.then(res => {
				if (!res) {
					this.logger.warn(`No INFO for '${nodeID}' node in registry.`);
					return;
				}
				try {
					const info = JSON.parse(res);
					return this.processRemoteNodeInfo(nodeID, info);
				} catch(err) {
					this.logger.warn("Unable to parse Redis INFO response", err, res);
				}
			});
	}

	/**
	 * Discover all nodes (after connected)
	 */
	discoverAllNodes() {
		return this.collectOnlineNodes();
	}

	/**
	 * Local service registry has been changed. We should notify remote nodes.
	 * @param {String} nodeID
	 */
	sendLocalNodeInfo(nodeID) {
		const info = this.broker.getLocalNodeInfo();

		const payload = Object.assign({
			ver: this.broker.PROTOCOL_VERSION,
			sender: this.broker.nodeID
		}, info);

		const key = this.INFO_KEY;

		return this.Promise.resolve()
			.then(() => this.client.setex(key, 30 * 60, JSON.stringify(payload)))
			.then(() => {
				this.lastLocalSeq = info.seq;

				this.recreateInfoUpdateTimer();

				// Sending a new heartbeat because it contains the `seq`
				if (!nodeID)
					return this.beat();
			});
	}

	/**
	 * Unregister local node after disconnecting.
	 */
	localNodeDisconnected() {
		return this.Promise.resolve()
			.then(() => super.localNodeDisconnected())
			.then(() => this.logger.debug("Remove local node from registry..."))
			.then(() => this.scanClean(this.INFO_KEY + "*"))
			.then(() => this.scanClean(this.BEAT_KEY + "*"));
	}

	/**
	 * Called when a remote node disconnected (received DISCONNECT packet)
	 * You can clean it from local cache.
	 *
	 * @param {String} nodeID
	 * @param {Object} payload
	 * @param {Boolean} isUnexpected
	 */
	remoteNodeDisconnected(nodeID, isUnexpected) {
		super.remoteNodeDisconnected(nodeID, isUnexpected);
		this.nodes.delete(nodeID);
	}

	/**
	 * Clean Redis key by pattern
	 * @param {String} match
	 */
	scanClean(match) {
		return new Promise((resolve, reject) => {
			const stream = this.client.scanStream({
				match,
				count: 100
			});

			stream.on("data", (keys = []) => {
				if (!keys.length) {
					return;
				}

				stream.pause();
				this.client.del(keys)
					.then(() => stream.resume())
					.catch((err) => reject(err));
			});

			stream.on("error", (err) => {
				this.logger.error(`Error occured while deleting Redis keys '${match}'.`, err);
				reject(err);
			});

			stream.on("end", () => resolve());
		});
	}
}

module.exports = RedisDiscoverer;
