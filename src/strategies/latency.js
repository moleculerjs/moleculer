/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */
"use strict";

const _ = require("lodash");

const { random } = require("lodash");
const BaseStrategy = require("./base");

/**
 * Lowest latency invocation strategy
 *
 * Since Strategy can be instantiated multiple times, therefore,
 * we need to have a "master" instance to send ping, and each
 * individual "slave" instance will update their list dynamically
 *
 * These options can be configured in broker registry options:
 *
 * const broker = new ServiceBroker({
 * 	logger: true,
 * 	registry: {
 * 		strategy: "LatencyStrategy",
 * 		strategyOptions: {
 * 			sampleCount: 5,
 * 			lowLatency: 10,
 * 			collectCount: 5,
 * 			pingInterval: 10
 * 		}
 * 	}
 * });
 *
 * @class LatencyStrategy
 */
class LatencyStrategy extends BaseStrategy {

	constructor(registry, broker) {
		super(registry, broker);

		this.opts = _.defaultsDeep(registry.opts.strategyOptions, {
			sampleCount: 5,
			lowLatency: 10,
			collectCount: 5,
			pingInterval: 10
		});

		this.brokerStopped = false;

		this.hostLatency = new Map();

		/* hostMap contains:
			hostname => {
				historicLatency: [],
				nodeList: []
			}
		*/
		this.hostMap = new Map();

		// short circuit
		if (!this.broker.transit) return;

		if (this.broker.localBus.listenerCount("$node.latencyMaster") === 0) {
			this.broker.logger.debug("Latency: We are MASTER");

			// claim as master
			this.broker.localBus.on("$node.latencyMaster", function() {});
			// respond to PONG
			this.broker.localBus.on("$node.pong", this.processPong.bind(this));
			// dynamically add new node
			this.broker.localBus.on("$node.connected", this.addNode.bind(this));
			// dynamically remove node
			this.broker.localBus.on("$node.disconnected", this.removeHostMap.bind(this));
			// try to discovery all nodes on start up
			this.broker.localBus.on("$broker.started", this.discovery.bind(this));
			// clean up ourselves
			this.broker.localBus.on("$broker.stopped", () => this.brokerStopped = true);
		} else {
			this.broker.logger.debug("Latency: We are SLAVE");
			// remove node if we are told by master
			this.broker.localBus.on("$node.latencySlave.removeHost", this.removeHostLatency.bind(this));
		}

		this.broker.localBus.on("$node.latencySlave", this.updateLatency.bind(this));
	}

	// Master
	discovery() {
		return this.broker.transit.sendPing().then(function() {
			setTimeout(this.pingHosts.bind(this), 1000 * this.opts.pingInterval);
		}.bind(this));
	}

	// Master
	pingHosts() {

		if (this.brokerStopped) return;

		this.broker.logger.debug("Latency: Sending ping to hosts");
		/*
			Smart Ping: only ping the host, not the nodes (which may be many)

			Although, if that particular node on the host is overloaded,
			the measurement may be skewed.
		*/
		let hosts = [];
		if (this.hostMap.size > 0) {
			hosts = this.hostMap.values();
		}

		this.broker.Promise.map(hosts, function(host) {
			this.broker.logger.debug("Latency: Sending ping to", host.nodeList[0]);
			return this.broker.transit.sendPing(host.nodeList[0]);
		}.bind(this), { concurrency: 5 }).then(function() {
			setTimeout(this.pingHosts.bind(this), 1000 * this.opts.pingInterval);
		}.bind(this));
	}

	// Master
	processPong(payload) {
		let node = this.registry.nodes.get(payload.nodeID);
		if (!node) return;

		let avgLatency = null;

		this.broker.logger.debug("Latency: Process incoming pong");

		this.mapNode(node);

		let hostMap = this.hostMap.get(node.hostname);

		if (hostMap.historicLatency.length > (this.opts.collectCount - 1))
			hostMap.historicLatency.shift();

		hostMap.historicLatency.push(payload.elapsedTime);

		avgLatency = hostMap.historicLatency.reduce(function(sum, latency) {
			return sum + latency;
		}, 0) / hostMap.historicLatency.length;

		this.broker.logger.debug("Latency: Broadcasting latency update");

		this.broker.localBus.emit("$node.latencySlave", {
			hostname: node.hostname,
			avgLatency: avgLatency
		});
	}

	// Master
	mapNode(node) {
		if (typeof this.hostMap.get(node.hostname) === "undefined") {
			this.hostMap.set(node.hostname, {
				historicLatency: [],
				nodeList: [ node.id ]
			});
		}
	}

	// Master
	addNode(payload) {

		this.broker.logger.debug("Latency: adding new node");

		let node = payload.node;

		this.mapNode(node);
		// each host may have multiple nodes
		let hostMap = this.hostMap.get(node.hostname);
		if (hostMap.nodeList.indexOf(node.id) === -1) {
			hostMap.nodeList.push(node.id);
		}

		this.broker.logger.debug("Latency: ", node.hostname, "has", hostMap.nodeList.length, "nodes");
	}

	// Master
	removeHostMap(payload) {
		let node = payload.node;

		let hostMap = this.hostMap.get(node.hostname);
		if (typeof hostMap === "undefined") return;

		let nodeIndex = hostMap.nodeList.indexOf(node.id);
		if (nodeIndex > -1) {
			hostMap.nodeList.splice(nodeIndex, 1);
		}

		if (hostMap.nodeList.length > 0) return;

		// only remove the host if the last node disconnected

		this.broker.logger.debug("Latency: removing host", node.hostname);

		this.broker.localBus.emit("$node.latencySlave.removeHost", node.hostname);
		this.hostMap.delete(node.hostname);
	}

	// Slave
	updateLatency(payload) {
		this.broker.logger.debug("Latency update received", payload);
		this.hostLatency.set(payload.hostname, payload.avgLatency);
	}

	// Slave
	removeHostLatency(hostname) {
		this.hostLatency.delete(hostname);
	}

	select(list) {
		let minEp = null;
		let minLatency = null;

		const sampleCount = this.opts.sampleCount;
		const count = sampleCount <= 0 || sampleCount > list.length ? list.length : sampleCount;
		for (let i = 0; i < count; i++) {
			let ep;
			// Get random endpoint
			if (count == list.length) {
				ep = list[i];
			} else {
				ep = list[random(0, list.length - 1)];
			}
			const epLatency = this.hostLatency.get(ep.node.hostname);

			// Check latency of endpoint
			if (typeof epLatency !== "undefined") {

				if (epLatency < this.opts.lowLatency)
					return ep;

				if (!minEp || !minLatency || epLatency < minLatency) {
					minLatency = epLatency;
					minEp = ep;
				}
			}
		}

		// Return the lowest latency
		if (minEp) {
			this.broker.logger.debug("Latency: Select", minEp.node.hostname, minLatency);
			return minEp;
		}

		this.broker.logger.debug("Latency: Select random");

		// Return a random item (no latency data)
		return list[random(0, list.length - 1)];
	}
}

module.exports = LatencyStrategy;
