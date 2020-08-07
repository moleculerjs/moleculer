/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const { BrokerOptionsError } = require("../../errors");
const BaseDiscoverer = require("./base");
const { METRIC } = require("../../metrics");
const Serializers = require("../../serializers");
const { removeFromArray, isFunction } = require("../../utils");

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
		if (typeof opts === "string")
			opts = { redis: opts };

		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			redis: null,
			serializer: "JSON",
			fullCheck: 10, // Disable with `0` or `null`
			scanLength: 100,
			monitor: false,
		});

		// Loop counter for full checks. Starts from a random value for better distribution
		this.idx = this.opts.fullCheck > 1 ? _.random(this.opts.fullCheck - 1) : 0;

		// Redis client instance
		this.client = null;

		// Timer for INFO packets expiration updating
		this.infoUpdateTimer = null;

		// Last sequence numbers
		this.lastInfoSeq = 0;
		this.lastBeatSeq = 0;

		this.reconnecting = false;
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

		this.logger.warn(kleur.yellow().bold("Redis Discoverer is an EXPERIMENTAL module. Do NOT use it in production!"));

		// Using shorter instanceID to reduce the network traffic
		this.instanceHash = this.broker.instanceID.substring(0, 8);

		this.PREFIX = `MOL${this.broker.namespace ? "-" + this.broker.namespace : ""}-DSCVR`;
		this.BEAT_KEY = `${this.PREFIX}-BEAT:${this.broker.nodeID}|${this.instanceHash}`;
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
			if (this.reconnecting) {
				this.reconnecting = false;
				this.sendLocalNodeInfo();
			}
		});

		this.client.on("reconnecting", () => {
			/* istanbul ignore next */
			this.logger.warn("Redis Discoverer client reconnecting...");
			this.reconnecting = true;
			this.lastInfoSeq = 0;
			this.lastBeatSeq = 0;
		});

		this.client.on("error", (err) => {
			/* istanbul ignore next */
			this.logger.error(err);
		});

		if (this.opts.monitor && isFunction(this.client.monitor)) {
			this.client.monitor((err, monitor) => {
				this.logger.debug("Redis Discoverer entering monitoring mode...");
				monitor.on("monitor", (time, args/*, source, database*/) => this.logger.debug(args));
			});
		}

		// create an instance of serializer (default to JSON)
		this.serializer = Serializers.resolve(this.opts.serializer);
		this.serializer.init(this.broker);

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
			this.client.expire(this.INFO_KEY, 60 * 60); // 60 mins
			this.recreateInfoUpdateTimer();
		}, 20 * 60 * 1000 ); // 20 mins
		this.infoUpdateTimer.unref();
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

			// timestamp: Date.now(),
			cpu: this.localNode.cpu,
			seq: this.localNode.seq,
			instanceID: this.broker.instanceID
		};

		const seq = this.localNode.seq;
		const key = this.BEAT_KEY + "|" + seq;

		return this.Promise.resolve()
			.then(() => {
				// Create a multi pipeline
				let pl = this.client.multi();

				if (seq != this.lastBeatSeq) {
					// Remove previous BEAT keys
					pl = pl.del(this.BEAT_KEY + "|" + this.lastBeatSeq);
				}

				// Create new HB key
				pl = pl.setex(key, this.opts.heartbeatTimeout, this.serializer.serialize(data));
				return pl.exec();
			})
			.then(() => this.lastBeatSeq = seq)
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
		// Get the current node list so that we can check the disconnected nodes.
		const prevNodes = this.registry.nodes.list({ onlyAvailable: true, withServices: false })
			.map(node => node.id)
			.filter(nodeID => nodeID !== this.broker.nodeID);

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
							//this.logger.debug("Full check", this.idx);
							this.idx = 0;

							return this.client.mgetBuffer(...scannedKeys)
								.then(packets => packets.map((raw, i) => {
									try {
										const p = scannedKeys[i].substring(`${this.PREFIX}-BEAT:`.length).split("|");
										return {
											sender: p[0],
											instanceID: p[1],
											seq: Number(p[2]),
											...this.serializer.deserialize(raw)
										};
									} catch(err) {
										this.logger.warn("Unable to parse HEARTBEAT packet", err, raw);
									}
								}));
						} else {
							//this.logger.debug("Lazy check", this.idx);
							// Lazy check
							return scannedKeys.map(key => {
								const p = key.substring(`${this.PREFIX}-BEAT:`.length).split("|");
								return {
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

							removeFromArray(prevNodes, packet.sender);
							this.heartbeatReceived(packet.sender, packet);
						});
					})
					.then(() => resolve());
			});

		}).then(() => {
			if (prevNodes.length > 0) {
				// Disconnected nodes
				prevNodes.forEach(nodeID => {
					this.logger.info(`The node '${nodeID}' is not available. Removing from registry...`);
					this.remoteNodeDisconnected(nodeID, true);
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
		return this.client.getBuffer(`${this.PREFIX}-INFO:${nodeID}`)
			.then(res => {
				if (!res) {
					this.logger.warn(`No INFO for '${nodeID}' node in registry.`);
					return;
				}
				try {
					const info = this.serializer.deserialize(res);
					return this.processRemoteNodeInfo(nodeID, info);
				} catch(err) {
					this.logger.warn("Unable to parse INFO packet", err, res);
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
		const seq = this.localNode.seq;

		return this.Promise.resolve()
			.then(() => this.client.setex(key, 30 * 60, this.serializer.serialize(payload)))
			.then(() => {
				this.lastInfoSeq = seq;

				this.recreateInfoUpdateTimer();

				// Sending a new heartbeat because it contains the `seq`
				if (!nodeID)
					return this.beat();
			})
			.catch(err => {
				this.logger.error("Unable to send INFO to Redis server", err);
			});
	}

	/**
	 * Unregister local node after disconnecting.
	 */
	localNodeDisconnected() {
		return this.Promise.resolve()
			.then(() => super.localNodeDisconnected())
			.then(() => this.logger.debug("Remove local node from registry..."))
			.then(() => this.client.del(this.INFO_KEY))
			.then(() => this.scanClean(this.BEAT_KEY + "*"));
	}

	/**
	 * Clean Redis key by pattern
	 * @param {String} match
	 */
	scanClean(match) {
		return new Promise((resolve, reject) => {
			const stream = this.client.scanStream({
				match,
				count: this.opts.scanLength
			});

			stream.on("data", (keys = []) => {
				if (!keys.length) {
					return;
				}

				stream.pause();
				return this.client.del(keys)
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
