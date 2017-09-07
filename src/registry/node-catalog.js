/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 			= require("lodash");
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
		this.heartbeatTimer = setInterval(() => {
			this.localNode.updateLocalInfo();
			/* istanbul ignore next */
			if (this.broker.transit)
				this.broker.transit.sendHeartbeat(this.localNode);

		}, this.broker.options.heartbeatInterval * 1000);
		this.heartbeatTimer.unref();

		this.checkNodesTimer = setInterval(() => {
			/* istanbul ignore next */
			this.checkRemoteNodes();
		}, this.broker.options.heartbeatTimeout * 1000);
		this.checkNodesTimer.unref();
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
		node.client = {
			type: "nodejs",
			version: this.broker.MOLECULER_VERSION,
			langVersion: process.version
		};

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
			node.available = true;
		}

		// Update instance
		node.update(payload);

		if (node.services) {
			this.registry.registerServices(node, payload.services);
		}

		// Local notifications
		if (isNew) {
			this.broker.broadcastLocal("$node.connected", { node, reconnected: false });
			this.logger.info(`Node '${nodeID}' connected!`);
		} else if (isReconnected) {
			this.broker.broadcastLocal("$node.connected", { node, reconnected: true });
			this.logger.info(`Node '${nodeID}' reconnected!`);
		} else {
			this.broker.broadcastLocal("$node.updated", { node });
			this.logger.debug(`Node '${nodeID}' updated!`);
		}

	}

	/**
	 * Check all registered remote nodes are available.
	 *
	 * @memberOf Transit
	 */
	checkRemoteNodes() {
		const now = Date.now();
		this.nodes.forEach(node => {
			if (node.local || !node.available) return;

			if (now - (node.lastHeartbeatTime || 0) > this.broker.options.heartbeatTimeout * 1000) {
				this.logger.warn(`Heartbeat is not received from '${node.id}' node!`);
				this.disconnected(node.id, true);
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

			if (isUnexpected)
				this.logger.warn(`Node '${node.id}' disconnected (unexpected)!`);
			else
				this.logger.warn(`Node '${node.id}' disconnected`);

			this.broker.servicesChanged(false);
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
	 * @param {boolean} withServices
	 * @returns
	 * @memberof NodeCatalog
	 */
	list(withServices = false) {
		let res = [];
		this.nodes.forEach(node => {
			if (withServices)
				res.push(node);
			else
				res.push(_.omit(node, ["services"]));
		});

		return res;
	}
}

module.exports = NodeCatalog;
