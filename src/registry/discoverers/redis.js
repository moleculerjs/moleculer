/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const BaseDiscoverer = require("./base");

const Redis = require("ioredis");

/**
 * Local (built-in) Discoverer class
 *
 * TODO: RedisCluster
 * @class Discoverer
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
			redis: null
		});

		// Store the online nodes.
		this.nodes = new Map();

		this.client = null;
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

		this.PREFIX = `MOL${this.broker.namespace ? "-" + this.broker.namespace : ""}-DISCOVER`;
		this.BEAT_KEY = `${this.PREFIX}-BEAT-${this.broker.nodeID}`;
		this.INFO_KEY = `${this.PREFIX}-INFO-${this.broker.nodeID}`;

		this.client = new Redis(this.opts.redis);
		this.client.on("connect", () => {
			/* istanbul ignore next */
			this.logger.info("Redis heartbeat client connected.");
		});

		this.client.on("error", (err) => {
			/* istanbul ignore next */
			this.logger.error(err);
		});
	}

	/**
	 * Stop discoverer clients.
	 */
	stop() {
		return super.stop()
			.then(() => {
				if (this.client)
					return this.client.quit();
			});
	}

	/**
	 * Sending a local heartbeat
	 * @param {Node} localNode
	 */
	sendHeartbeat(localNode) {
		const data = {
			sender: this.broker.nodeID,
			ver: this.broker.PROTOCOL_VERSION,

			timestamp: Date.now(),
			cpu: localNode.cpu,
			seq: localNode.seq
		};
		return this.client.setex(this.BEAT_KEY, this.opts.heartbeatTimeout, JSON.stringify(data))
			//.then(() => this.logger.debug("Heartbeat sent."))
			.then(() => this.collectOnlineNodes());
	}

	/**
	 * Collect online nodes from Redis server.
	 */
	async collectOnlineNodes() {
		// Collect the online node keys.
		const onlineKeys = await new Promise((resolve, reject) => {
			const res = [];
			const stream = this.client.scanStream({
				match: `${this.PREFIX}-BEAT*`,
				count: 100
			});
			stream.on("data", keys => {
				if (!keys || !keys.length) return;

				res.push(...keys);
			});

			stream.on("error", (err) => {
				this.logger.error("Error occured while scanning HB keys.", err);
				reject(err);
			});

			stream.on("end", function() {
				resolve(res);
			});
		});

		// Save the previous state so that we can check the disconnected nodes.
		const prevNodes = new Map(this.nodes);

		await this.Promise.mapSeries(onlineKeys, async key => {
			const res = await this.client.get(key);
			try {
				const packet = JSON.parse(res);
				if (packet.sender == this.broker.nodeID) return;

				prevNodes.delete(packet.sender);

				const prevPacket = this.nodes.get(packet.sender);
				if (!prevPacket) {
					await this.discoverNode(packet.sender);
				} else {
					if (prevPacket.seq !== packet.seq) {
						// INFO is updated.
						await this.discoverNode(packet.sender);
					}
				}
				this.nodes.set(packet.sender, packet);

				this.heartbeatReceived(packet.sender, packet);
			} catch(err) {
				this.logger.warn("Unable to parse Redis response", res);
			}
		});

		if (prevNodes.size > 0) {
			this.logger.info("prevNodes", prevNodes);
			// Disconnected nodes
			Array.from(prevNodes.keys()).map(nodeID => {
				this.remoteNodeDisconnected(nodeID, true);
				this.nodes.delete(nodeID);
			});
		}
	}

	/**
	 * Discover a new or old node.
	 * @param {String} nodeID
	 */
	async discoverNode(nodeID) {
		const res = await this.client.get(`${this.PREFIX}-INFO-${nodeID}`);
		try {
			const info = JSON.parse(res);
			await this.processRemoteNodeInfo(nodeID, info);
		} catch(err) {
			this.logger.warn("Unable to parse Redis response", res);
		}
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

		return this.client.set(this.INFO_KEY, JSON.stringify(payload))
			.then(() => {
				// Sending a new heartbeat because it contains the `seq`
				if (!nodeID) this.beat();
			});
	}

	async localNodeDisconnected() {
		await super.localNodeDisconnected();
		this.logger.debug("Remove local node from registry...");
		await this.client.del(this.INFO_KEY);
		await this.client.del(this.BEAT_KEY);
	}
}

module.exports = RedisDiscoverer;
