/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const Node = require("./node");

class NodeCatalog {

	constructor(registry, broker, logger) {
		this.registry = registry;
		this.broker = broker;
		this.logger = logger;

		this.nodes = new Map();

		this.createLocalNode();
	}

	createLocalNode() {
		const node = new Node(this.broker.nodeID);
		node.local = true;

		this.add(node.id, node);

		this._localNode = node;
		return node;
	}

	add(id, node) {
		this.nodes.set(id, node);
	}

	has(id) {
		return this.nodes.has(id);
	}

	get(id) {
		return this.nodes.get(id);
	}

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
		}

		// Update instance
		node.update(payload);

		if (node.services) {
			this.registry.registerServices(node, payload.services);
		}

		// Local notifications
		if (isNew) {
			this.broker.emitLocal("$node.connected", { node, reconnected: false });
			this.logger.info(`Node '${nodeID}' connected!`);
		} else if (isReconnected) {
			this.broker.emitLocal("$node.connected", { node, reconnected: true });
			this.logger.info(`Node '${nodeID}' reconnected!`);
		} else {
			this.broker.emitLocal("$node.updated", { node });
			this.logger.debug(`Node '${nodeID}' updated!`);
		}

	}

	get localNode() {
		// Update local node info
		this._localNode.updateFromLocal();
		return this._localNode;
	}

	/**
	 * Check all registered remote nodes is live.
	 *
	 * @memberOf Transit
	 */
	checkRemoteNodes() {
		const now = Date.now();
		this.nodes.forEach(node => {
			if (node.local || !node.available) return;

			if (now - (node.lastHeartbeatTime || 0) > this.broker.options.heartbeatTimeout * 1000) {
				this.logger.warn("Node timeout!", node, now);
				this.registry.nodeDisconnected(node.id, true);
			}
		});
	}

	heartbeat(payload) {
		const node = this.get(payload.sender);
		if (node)
			node.heartbeat(payload);
	}

}

module.exports = NodeCatalog;
