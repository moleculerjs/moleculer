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

let ETCD3;

/**
 * etcd3-based Discoverer class
 *
 * @class Etcd3Discoverer
 */
class Etcd3Discoverer extends BaseDiscoverer {

	/**
	 * Creates an instance of Discoverer.
	 *
	 * @memberof Etcd3Discoverer
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			etcd: undefined,
			serializer: "JSON"
		});

		// Loop counter for full checks. Starts from a random value for better distribution
		this.idx = this.opts.fullCheck > 1 ? _.random(this.opts.fullCheck - 1) : 0;

		// Store the online nodes.
		this.nodes = new Map();

		// Etcd client instance
		this.client = null;

		// Last local INFO sequence number
		this.lastLocalSeq = 0;

		// Leases
		this.leaseHeartbeat = null;
		this.leaseInfo = null;
	}

	/**
	 * Initialize Discoverer
	 *
	 * @param {any} registry
	 *
	 * @memberof Etcd3Discoverer
	 */
	init(registry) {
		super.init(registry);

		try {
			ETCD3 = require("etcd3");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'etcd3' package is missing. Please install it with 'npm install etcd3 --save' command.", err, true);
		}

		this.PREFIX = `moleculer${this.broker.namespace ? "-" + this.broker.namespace : ""}/discovery`;
		this.BEAT_KEY = `${this.PREFIX}/beats/${this.broker.nodeID}`;
		this.INFO_KEY = `${this.PREFIX}/info/${this.broker.nodeID}`;

		this.client = new ETCD3.Etcd3(this.opts.etcd);

		// create an instance of serializer (default to JSON)
		this.serializer = Serializers.resolve(this.opts.serializer);
		this.serializer.init(this.broker);

		this.logger.debug("Etcd3 Discoverer created. Prefix:", this.PREFIX);
	}

	/**
	 * Stop discoverer clients.
	 */
	stop() {
		return super.stop()
			.then(() => {
				if (this.client)
					return this.client.close();
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
	 * Sending a local heartbeat to etcd.
	 */
	sendHeartbeat() {
		//const timeEnd = this.broker.metrics.timer(METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TIME);
		const data = {
			sender: this.broker.nodeID,
			ver: this.broker.PROTOCOL_VERSION,

			timestamp: Date.now(),
			cpu: this.localNode.cpu,
			seq: this.localNode.seq,
			instanceID: this.broker.instanceID
		};

		const key = this.BEAT_KEY;

		return this.Promise.resolve()
			.then(() => {
				if (!this.leaseHeartbeat) {
					this.leaseHeartbeat = this.client.lease(this.opts.heartbeatTimeout);
					return this.leaseHeartbeat.grant();
				}
			})
			.then(() => this.leaseHeartbeat.put(key).value(this.serializer.serialize(data)))
			.then(() => this.collectOnlineNodes())
			.catch(err => this.logger.error("Error occured while collect etcd keys.", err))
			.then(() => {
				//timeEnd();
				//this.broker.metrics.increment(METRIC.MOLECULER_DISCOVERER_REDIS_COLLECT_TOTAL);
			});
	}

	/**
	 * Collect online nodes from etcd server.
	 */
	collectOnlineNodes() {
		// Save the previous state so that we can check the disconnected nodes.
		const prevNodes = new Map(this.nodes);

		// Collect the online node keys.
		return this.client.getAll().prefix(`${this.PREFIX}/beats/`).buffers()
			.then(result => Object.values(result).map(raw => {
				try {
					return this.serializer.deserialize(raw);
				} catch(err) {
					this.logger.warn("Unable to parse Redis response", err, raw);
				}
			}))

			.then(packets => {
				_.compact(packets).map(packet => {
					if (packet.sender == this.broker.nodeID) return;

					prevNodes.delete(packet.sender);
					this.nodes.set(packet.sender, packet);
					this.heartbeatReceived(packet.sender, packet);
				});
			})

			.then(() => {
				if (prevNodes.size > 0) {
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
		return this.client.get(`${this.PREFIX}/info/${nodeID}`).buffer()
			.then(res => {
				if (!res) {
					this.logger.warn(`No INFO for '${nodeID}' node in registry.`);
					return;
				}
				try {
					const info = this.serializer.deserialize(res);
					return this.processRemoteNodeInfo(nodeID, info);
				} catch(err) {
					this.logger.warn("Unable to parse etcd INFO response", err, res);
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

		let leaseInfo = this.leaseInfo;

		return this.Promise.resolve()
			.then(() => {
				if (leaseInfo) {
					if (info.seq != this.lastLocalSeq) {
						const p = leaseInfo.revoke();
						leaseInfo = null;
						return p;
					}
				}
			})
			.then(() => {
				if (!leaseInfo) {
					leaseInfo = this.client.lease(60);
					const p = leaseInfo.grant();
					return p.then(() => this.leaseInfo = leaseInfo);
				}
			})
			.then(() => leaseInfo.put(key).value(this.serializer.serialize(payload)))
			.then(() => {
				this.lastLocalSeq = info.seq;

				// Sending a new heartbeat because it contains the `seq`
				if (!nodeID)
					return this.beat();
			})
			.catch(err => {
				this.logger.error("Unable to send INFO to etcd server", err);
			});
	}

	/**
	 * Unregister local node after disconnecting.
	 */
	localNodeDisconnected() {
		return this.Promise.resolve()
			.then(() => super.localNodeDisconnected())
			.then(() => this.logger.debug("Remove local node from registry..."))
			.then(() => this.client.delete().key(this.INFO_KEY))
			.then(() => this.client.delete().key(this.BEAT_KEY))
			.then(() => {
				if (this.leaseHeartbeat)
					this.leaseHeartbeat.revoke();
				if (this.leaseInfo)
					this.leaseInfo.revoke();
			});
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
}

module.exports = Etcd3Discoverer;
