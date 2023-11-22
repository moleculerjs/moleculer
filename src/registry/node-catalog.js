/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const os = require("os");
const Node = require("./node");
const { getIpList } = require("../utils");

/**
 * Import types
 *
 * @typedef {import("./registry")} Registry
 * @typedef {import("../service-broker")} ServiceBroker
 */

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

		this.createLocalNode();
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
	 * Delete a node by nodeID
	 *
	 * @param {String} id
	 * @returns
	 * @memberof NodeCatalog
	 */
	delete(id) {
		return this.nodes.delete(id);
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
			if (node.available) count++;
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
			node.lastHeartbeatTime = Math.round(process.uptime());
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

			this.registry.updateMetrics();

			if (isUnexpected) this.logger.warn(`Node '${node.id}' disconnected unexpectedly.`);
			else this.logger.info(`Node '${node.id}' disconnected.`);

			if (this.broker.transit) this.broker.transit.removePendingRequestByNodeID(nodeID);
		}
	}

	/**
	 * Get a node list
	 *
	 * @param {Object} opts
	 * @param {Boolean} [opts.onlyAvailable = false]
	 * @param {Boolean} [opts.withServices = false]
	 * @returns
	 * @memberof NodeCatalog
	 */
	list({ onlyAvailable = false, withServices = false } = {}) {
		let res = [];
		this.nodes.forEach(node => {
			if (onlyAvailable && !node.available) return;

			if (withServices) res.push(_.omit(node, ["rawInfo"]));
			else res.push(_.omit(node, ["services", "rawInfo"]));
		});

		return res;
	}

	/**
	 * Get a copy from node list.
	 */
	toArray() {
		return Array.from(this.nodes.values());
	}
}

module.exports = NodeCatalog;
