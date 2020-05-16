/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

/**
 * Abstract Discoverer class
 *
 * TODO:
 *  - using process.uptime() instead of Date.now() for heartbeats
 *
 * @class BaseDiscoverer
 */
class BaseDiscoverer {

	/**
	 * Creates an instance of Discoverer.
	 *
	 * @memberof BaseDiscoverer
	 */
	constructor(opts) {
		this.Promise = Promise; // while `init` is not called

		this.opts = _.defaultsDeep({}, opts, {
			heartbeatInterval: null,
			heartbeatTimeout: null,

			disableHeartbeatChecks: false,
			disableOfflineNodeRemoving: false,
			cleanOfflineNodesTimeout: 10 * 60, // 10 minutes
		});

		// Timer variables
		this.heartbeatTimer = null;
		this.checkNodesTimer = null;
		this.offlineTimer = null;

		// Pointer for the local `Node` instance
		this.localNode = null;
	}

	/**
	 * Initialize Discoverer
	 *
	 * @param {ServiceRegistry} registry
	 */
	init(registry) {
		this.registry = registry;
		this.broker = registry.broker;
		this.Promise = this.broker.Promise;

		if (this.broker) {
			this.logger = this.broker.getLogger("Discovery");
			this.transit = this.broker.transit;

			// Get HB time settings from broker options. Backward compatibility
			if (this.opts.heartbeatInterval == null)
				this.opts.heartbeatInterval = this.broker.options.heartbeatInterval;
			if (this.opts.heartbeatTimeout == null)
				this.opts.heartbeatTimeout = this.broker.options.heartbeatTimeout;
		}

		if (this.transit) {
			this.broker.localBus.on("$transporter.connected", () => this.startHeartbeatTimers());
			this.broker.localBus.on("$transporter.disconnected", () => this.stopHeartbeatTimers());
		}

		this.localNode = this.registry.nodes.localNode;

		this.registerMoleculerMetrics();
	}

	/**
	 * Stop discoverer clients.
	 */
	stop() {
		this.stopHeartbeatTimers();
		return this.Promise.resolve();
	}

	/**
	 * Register Moleculer Transit Core metrics.
	 */
	registerMoleculerMetrics() {
		// Not implemented
	}

	/**
	 * Start heartbeat timers
	 */
	startHeartbeatTimers() {
		this.stopHeartbeatTimers();

		if (this.opts.heartbeatInterval > 0) {
			// HB timer
			const time = this.opts.heartbeatInterval * 1000 + (Math.round(Math.random() * 1000) - 500); // random +/- 500ms
			this.heartbeatTimer = setInterval(() => this.beat(), time);
			this.heartbeatTimer.unref();

			// Check expired heartbeats of remote nodes timer
			this.checkNodesTimer = setInterval(() => this.checkRemoteNodes(), this.opts.heartbeatTimeout * 1000);
			this.checkNodesTimer.unref();

			// Clean offline nodes timer
			this.offlineTimer = setInterval(() => this.checkOfflineNodes(), 30 * 1000); // 30 secs
			this.offlineTimer.unref();
		}
	}

	/**
	 * Stop heartbeat timers
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
	 * Heartbeat method.
	 */
	beat() {
		// Update the local CPU usage before sending heartbeat.
		return this.localNode.updateLocalInfo(this.broker.getCpuUsage)
			.then(() => this.sendHeartbeat());
	}

	/**
	 * Check all registered remote nodes are available.
	 */
	checkRemoteNodes() {
		if (this.disableHeartbeatChecks) return;

		const now = Date.now();
		this.registry.nodes.toArray().forEach(node => {
			if (node.local || !node.available) return;
			if (!node.lastHeartbeatTime) {
				// Még nem jött be az első heartbeat.
				node.lastHeartbeatTime = now;
				return;
			}

			if (now - node.lastHeartbeatTime > this.broker.options.heartbeatTimeout * 1000) {
				this.logger.warn(`Heartbeat is not received from '${node.id}' node.`);
				this.registry.nodes.disconnected(node.id, true);
			}
		});
	}

	/**
	 * Check offline nodes. Remove which is older than 10 minutes.
	 */
	checkOfflineNodes() {
		if (this.disableOfflineNodeRemoving || !this.opts.cleanOfflineNodesTimeout) return;

		const now = Date.now();
		this.registry.nodes.toArray().forEach(node => {
			if (node.local || node.available) return;
			if (!node.lastHeartbeatTime) {
				// Még nem jött be az első heartbeat.
				node.lastHeartbeatTime = now;
				return;
			}

			if (now - node.lastHeartbeatTime > this.opts.cleanOfflineNodesTimeout * 1000) {
				this.logger.warn(`Removing offline '${node.id}' node from registry because it hasn't submitted heartbeat signal for 10 minutes.`);
				this.registry.nodes.delete(node.id);
			}
		});
	}

	/**
	 * Heartbeat received from a remote node.
	 *
	 * @param {String} nodeID
	 * @param {Object} payload
	 */
	heartbeatReceived(nodeID, payload) {
		const node = this.registry.nodes.get(nodeID);
		if (node) {
			if (!node.available) {
				// Reconnected node. Request a fresh INFO
				this.discoverNode(nodeID);
			} else {
				if (payload.seq != null && node.seq !== payload.seq) {
					// Some services changed on the remote node. Request a new INFO
					this.discoverNode(nodeID);
				} else if (payload.instanceID != null && !node.instanceID.startsWith(payload.instanceID)) {
					// The node has been restarted. Request a new INFO
					this.discoverNode(nodeID);
				} else {
					node.heartbeat(payload);
				}
			}
		} else {
			// Unknow node. Request an INFO
			this.discoverNode(nodeID);
		}
	}

	/**
	 * Received an INFO from a remote node.
	 *
	 * @param {String} nodeID
	 * @param {Object} payload
	 */
	processRemoteNodeInfo(nodeID, payload) {
		return this.broker.registry.processNodeInfo(payload);
	}

	/**
	 * Sending a local heartbeat to remote nodes.
	 */
	sendHeartbeat() {
		if (!this.transit) return this.Promise.resolve();
		return this.transit.sendHeartbeat(this.localNode);
	}

	/**
	 * Discover a new or old node by nodeID
	 *
	 * @param {String} nodeID
	 */
	discoverNode() {
		/* istanbul ignore next */
		throw new Error("Not implemented");
	}

	/**
	 * Discover all nodes (after connected)
	 */
	discoverAllNodes() {
		/* istanbul ignore next */
		throw new Error("Not implemented");
	}

	/**
	 * Called when the local node is ready (transporter connected)
	 */
	localNodeReady() {
		// Local node has started all local services. We send a new INFO packet
		// which contains the local services because we are ready to accept incoming requests.
		return this.sendLocalNodeInfo();
	}

	/**
	 * Local service registry has been changed. We should notify remote nodes.
	 *
	 * @param {String} nodeID
	 */
	sendLocalNodeInfo() {
		/* istanbul ignore next */
		throw new Error("Not implemented");
	}

	/**
	 * Called when the local node disconnected.
	 * You can clean it from the remote registry.
	 */
	localNodeDisconnected() {
		if (!this.transit) return this.Promise.resolve();
		return this.transit.sendDisconnectPacket();
	}

	/**
	 * Called when a remote node disconnected (received DISCONNECT packet)
	 * You can clean it from local registry.
	 *
	 * @param {String} nodeID
	 * @param {Boolean} isUnexpected
	 */
	remoteNodeDisconnected(nodeID, isUnexpected) {
		return this.registry.nodes.disconnected(nodeID, isUnexpected);
	}

}

module.exports = BaseDiscoverer;
