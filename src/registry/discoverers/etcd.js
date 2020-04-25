/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const BaseDiscoverer = require("./base");
const { METRIC } = require("../../metrics");
const Serializers = require("../../serializers");
const { promisify } = require("util");

let Etcd;

/**
 * etcd-based v2 Discoverer class
 *
 * @class EtcdDiscoverer
 */
class EtcdDiscoverer extends BaseDiscoverer {

	/**
	 * Creates an instance of Discoverer.
	 *
	 * @memberof EtcdDiscoverer
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			fullCheck: 10, // Disable with `0` or `null`
			etcd: {
				urls: undefined,
				options: undefined
			},
			serializer: "JSON"
		});

		// Loop counter for full checks. Starts from a random value for better distribution
		this.idx = this.opts.fullCheck > 1 ? _.random(this.opts.fullCheck - 1) : 0;

		// Store the online nodes.
		this.nodes = new Map();

		// Etcd client instance
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
	 * @memberof EtcdDiscoverer
	 */
	init(registry) {
		super.init(registry);

		try {
			Etcd = require("node-etcd");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'node-etcd' package is missing. Please install it with 'npm install node-etcd --save' command.", err, true);
		}

		this.PREFIX = `moleculer${this.broker.namespace ? "-" + this.broker.namespace : ""}/discovery`;
		this.BEAT_KEY = `${this.PREFIX}/beats/${this.broker.nodeID}/${this.broker.instanceID}`;
		this.INFO_KEY = `${this.PREFIX}/info/${this.broker.nodeID}`;

		this.client = new Etcd(this.opts.etcd.urls, this.opts.etcd.options);

		["get", "set", "del"].forEach(method => this.client[method] = promisify(this.client[method]));

		// create an instance of serializer (default to JSON)
		this.serializer = Serializers.resolve(this.opts.serializer);
		this.serializer.init(this.broker);

		this.logger.debug("etcd Discoverer created. Prefix:", this.PREFIX);
	}

	/**
	 * Stop discoverer clients.
	 */
	stop() {
		if (this.infoUpdateTimer) clearTimeout(this.infoUpdateTimer);

		return super.stop()
			.then(() => {
				//if (this.client)
				//	return this.client.quit();
			});
	}

	/**
	 * Register Moleculer Transit Core metrics.
	 */
	registerMoleculerMetrics() {
		//this.broker.metrics.register({ name: METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TOTAL, type: METRIC.TYPE_COUNTER, rate: true, description: "Number of Service Registry fetching from Redis" });
		//this.broker.metrics.register({ name: METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TIME, type: METRIC.TYPE_HISTOGRAM, quantiles: true, unit: METRIC.UNIT_MILLISECONDS, description: "Time of Service Registry fetching from Redis" });
	}

	/**
	 * Recreate the INFO key update timer.
	 */
	recreateInfoUpdateTimer() {
		if (this.infoUpdateTimer) clearTimeout(this.infoUpdateTimer);

		this.infoUpdateTimer = setTimeout(() => {
			// Reset the INFO packet expiry.
			this.sendLocalNodeInfo();
			this.recreateInfoUpdateTimer();
		}, 20 * 60 * 1000 ); // 20 mins
	}

	/**
	 * Sending a local heartbeat to Redis.
	 */
	sendHeartbeat() {
		//console.log("REDIS - HB 1", localNode.id, this.heartbeatTimer);

		//const timeEnd = this.broker.metrics.timer(METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TIME);
		const data = {
			sender: this.broker.nodeID,
			ver: this.broker.PROTOCOL_VERSION,

			timestamp: Date.now(),
			cpu: this.localNode.cpu,
			seq: this.localNode.seq,
			instanceID: this.broker.instanceID
		};

		const key = this.BEAT_KEY + "/" + this.localNode.seq;

		console.log("HB Key:", key);

		return this.client.set(key, data, { ttl: this.opts.heartbeatTimeout })
			.then(() => this.collectOnlineNodes())
			.catch(err => this.logger.error("Error occured while scanning Redis keys.", err))
			.then(() => {
				//timeEnd();
				//this.broker.metrics.increment(METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TOTAL);
			});
	}

	/**
	 * Collect online nodes from Redis server.
	 */
	collectOnlineNodes() {
		// Save the previous state so that we can check the disconnected nodes.
		const prevNodes = new Map(this.nodes);

		// Collect the online node keys.
		return new this.Promise((resolve, reject) => {
			this.client.get(`${this.PREFIX}/beats/`, { recursive: true }, (err, res) => {
				console.log("res", res, err);
				resolve();
			});
			/*
			const stream = this.client.scanStream({
				match: ,
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
								.then(packets => packets.map(raw => {
									try {
										return this.serializer.deserialize(raw);
									} catch(err) {
										this.logger.warn("Unable to parse Redis response", err, raw);
									}
								}));
						} else {
							//this.logger.debug("Lazy check", this.idx);
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
			});*/

		}).then(() => {
			if (prevNodes.size > 0) {
				if (this.broker.nodeID == "master") this.logger.warn("Not found nodes", prevNodes.keys());
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
		return this.client.get(`${this.PREFIX}/info/${nodeID}`)
			.then(res => {
				if (!res) {
					this.logger.warn(`No INFO for '${nodeID}' node in registry.`);
					return;
				}
				try {
					const info = this.serializer.deserialize(res);
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

		console.log("INFO Key:", key);

		return this.Promise.resolve()
			.then(() => this.client.set(key, this.serializer.serialize(payload), { ttl: 30 * 60 }))
			.then(() => {
				this.lastLocalSeq = info.seq;

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
			.then(() => this.del(this.INFO_KEY))
			.then(() => this.del(this.BEAT_KEY + "/", { recursive: true }));
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

module.exports = EtcdDiscoverer;
