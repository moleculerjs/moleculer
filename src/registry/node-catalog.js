/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 			= require("lodash");
const os 			= require("os");
const Node 			= require("./node");
const { getIpList } = require("../utils");

/**
 * Catalog for nodes
 *
 * @class NodeCatalog
 */
class NodeCatalog {

	/**
	 * Creates an instance of NodeCatalog.
	 *
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 *
	 * @memberof NodeCatalog
	 */
	constructor(registry, broker) {
		this.registry = registry;
		this.broker = broker;
		this.logger = registry.logger;

		this.nodes = new Map();

		this.heartbeatTimer = null;
		this.checkNodesTimer = null;
		this.offlineTimer = null;

		this.disableHeartbeatChecks = false;
		this.disableOfflineNodeRemoving = false;

		this.createLocalNode();

		this.broker.localBus.on("$transporter.connected", this.startHeartbeatTimers.bind(this));
		this.broker.localBus.on("$transporter.disconnected", this.stopHeartbeatTimers.bind(this));
	}

	/**
	 * Start heartbeat timers
	 *
	 * @memberof NodeCatalog
	 */
	startHeartbeatTimers() {
		/* istanbul ignore next */
		this.heartbeatTimer = setInterval(() => {
			this.localNode.updateLocalInfo(this.broker.getCpuUsage).then(() => {
				if (this.broker.transit)
					this.broker.transit.sendHeartbeat(this.localNode);
			});

		}, this.broker.options.heartbeatInterval * 1000);

		if (typeof this.heartbeatTimer === "number") throw new Error("heartbeatTimer should not be a number. See issue [#362] for details.");

		this.heartbeatTimer.unref();

		/* istanbul ignore next */
		this.checkNodesTimer = setInterval(() => {
			this.checkRemoteNodes();
		}, this.broker.options.heartbeatTimeout * 1000);
		this.checkNodesTimer.unref();

		/* istanbul ignore next */
		this.offlineTimer = setInterval(() => {
			this.checkOfflineNodes();
		}, 30 * 1000); // 30 secs
		this.offlineTimer.unref();
	}

	/**
	 * Stop heartbeat timers
	 *
	 * @memberof NodeCatalog
	 */
	stopHeartbeatTimers() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}

		if (this.checkNodesTimer) {
			clearInterval(this.checkNodesTimer);
			this.checkNodesTimer = null;
		}

		if (this.offlineTimer) {
			clearInterval(this.offlineTimer);
			this.offlineTimer = null;
		}
	}

	/**
	 * Create local node with local information
	 *
	 * @returns
	 * @memberof NodeCatalog
	 */
	createLocalNode() {
		const node = new Node(this.broker.nodeID);
		node.local = true;
		node.ipList = getIpList();
		node.instanceID = this.broker.instanceID;
		node.hostname = os.hostname();
		node.client = {
			type: "nodejs",
			version: this.broker.MOLECULER_VERSION,
			langVersion: process.version
		};
		node.metadata = this.broker.metadata;
		node.seq = 1;

		this.add(node.id, node);

		this.localNode = node;
		return node;
	}

	/**
	 * Add a new node
	 *
	 * @param {String} id
	 * @param {any} node
	 * @memberof NodeCatalog
	 */
	add(id, node) {
		this.nodes.set(id, node);
	}

	/**
	 * Check a node exist by nodeID
	 *
	 * @param {String} id
	 * @returns
	 * @memberof NodeCatalog
	 */
	has(id) {
		return this.nodes.has(id);
	}

	/**
	 * Get a node by nodeID
	 *
	 * @param {String} id
	 * @returns
	 * @memberof NodeCatalog
	 */
	get(id) {
		return this.nodes.get(id);
	}

	/**
	 * Get count of all registered nodes
	 */
	count() {
		return this.nodes.size;
	}

	/**
	 * Get count of online nodes
	 */
	onlineCount() {
		let count = 0;
		this.nodes.forEach(node => {
			if (node.available)
				count++;
		});

		return count;
	}

	/**
	 * Process incoming INFO packet payload
	 *
	 * @param {any} payload
	 * @memberof NodeCatalog
	 */
	processNodeInfo(payload) {
		const nodeID = payload.sender;
		//let oldNode;
		let node = this.get(nodeID);
		let isNew = false;
		let isReconnected = false;

		if (!node) {
			isNew = true;
			node = new Node(nodeID);

			this.add(nodeID, node);
		} else if (!node.available) {
			isReconnected = true;
			node.lastHeartbeatTime = Date.now();
			node.available = true;
			node.offlineSince = null;
		}

		// Update instance
		const needRegister = node.update(payload, isReconnected);

		// Refresh services if 'seq' is greater or it is a reconnected node
		if (needRegister && node.services) {
			this.registry.registerServices(node, node.services);
		}

		// Local notifications
		if (isNew) {
			this.broker.broadcastLocal("$node.connected", { node, reconnected: false });
			this.logger.info(`Node '${nodeID}' connected.`);
			this.registry.updateMetrics();
		} else if (isReconnected) {
			this.broker.broadcastLocal("$node.connected", { node, reconnected: true });
			this.logger.info(`Node '${nodeID}' reconnected.`);
			this.registry.updateMetrics();
		} else {
			this.broker.broadcastLocal("$node.updated", { node });
			this.logger.debug(`Node '${nodeID}' updated.`);
		}

		return node;
	}

	/**
	 * Check all registered remote nodes are available.
	 *
	 * @memberof Transit
	 */
	checkRemoteNodes() {
		if (this.disableHeartbeatChecks) return;

		const now = Date.now();
		this.nodes.forEach(node => {
			if (node.local || !node.available) return;

			if (now - (node.lastHeartbeatTime || 0) > this.broker.options.heartbeatTimeout * 1000) {
				this.logger.warn(`Heartbeat is not received from '${node.id}' node.`);
				this.disconnected(node.id, true);
				this.registry.updateMetrics();
			}
		});
	}

	/**
	 * Check offline nodes. Remove which is older than 10 minutes.
	 *
	 * @memberof Transit
	 */
	checkOfflineNodes() {
		if (this.disableOfflineNodeRemoving) return;

		const now = Date.now();
		this.nodes.forEach(node => {
			if (node.local || node.available) return;

			if (now - (node.lastHeartbeatTime || 0) > 10 * 60 * 1000) {
				this.logger.warn(`Remove offline '${node.id}' node from registry because it hasn't submitted heartbeat signal for 10 minutes.`);
				this.nodes.delete(node.id);
				this.registry.updateMetrics();
			}
		});
	}

	/**
	 * Disconnected a node
	 *
	 * @param {String} nodeID
	 * @param {Boolean} isUnexpected
	 * @memberof NodeCatalog
	 */
	disconnected(nodeID, isUnexpected) {
		let node = this.get(nodeID);
		if (node && node.available) {
			node.disconnected(isUnexpected);

			this.registry.unregisterServicesByNode(node.id);

			this.broker.broadcastLocal("$node.disconnected", { node, unexpected: !!isUnexpected });

			this.logger.warn(`Node '${node.id}' disconnected${isUnexpected ? " unexpectedly" : ""}.`);

			if (this.broker.transit)
				this.broker.transit.removePendingRequestByNodeID(nodeID);
		}
	}

	/**
	 * Heartbeat
	 *
	 * @param {any} payload
	 * @memberof NodeCatalog
	 */
	heartbeat(payload) {
		const node = this.get(payload.sender);
		if (node) {
			if (!node.available) {
				// Unknow node. Request an INFO from node
				this.broker.transit.discoverNode(payload.sender);
			} else
				node.heartbeat(payload);

		} else {
			// Unknow node. Request an INFO from node
			this.broker.transit.discoverNode(payload.sender);
		}
	}

	/**
	 * Get a node list
	 *
	 * @param {Object} {onlyAvailable = false, withServices = false}
	 * @returns
	 * @memberof NodeCatalog
	 */
	list({ onlyAvailable = false, withServices = false }) {
		let res = [];
		this.nodes.forEach(node => {
			if (onlyAvailable && !node.available)
				return;

			if (withServices)
				res.push(_.omit(node, ["rawInfo"]));
			else
				res.push(_.omit(node, ["services", "rawInfo"]));
		});

		return res;
	}

	/**
	 * Get a copy from node list.
	 */
	toArray() {
		let res = [];
		this.nodes.forEach(node => res.push(node));
		return res;
	}
}

module.exports = NodeCatalog;
