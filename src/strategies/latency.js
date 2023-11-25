/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
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
	constructor(registry, broker, opts) {
		super(registry, broker, opts);

		this.opts = _.defaultsDeep(opts, {
			sampleCount: 5,
			lowLatency: 10,
			collectCount: 5,
			pingInterval: 10
		});

		this.brokerStopped = false;

		this.hostAvgLatency = new Map();

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
			// claim as master
			this.broker.localBus.on("$node.latencyMaster", function () {});
			// respond to PONG
			this.broker.localBus.on("$node.pong", this.processPong.bind(this));
			// dynamically add new node
			this.broker.localBus.on("$node.connected", this.addNode.bind(this));
			// dynamically remove node
			this.broker.localBus.on("$node.disconnected", this.removeHostMap.bind(this));
			// try to discovery all nodes on start up
			this.broker.localBus.on("$broker.started", this.discovery.bind(this));
			// clean up ourselves
			this.broker.localBus.on("$broker.stopped", () => (this.brokerStopped = true));
		} else {
			// remove node if we are told by master
			this.broker.localBus.on(
				"$node.latencySlave.removeHost",
				this.removeHostLatency.bind(this)
			);
		}

		this.broker.localBus.on("$node.latencySlave", this.updateLatency.bind(this));
	}

	// Master
	discovery() {
		return this.broker.transit.sendPing().then(() => {
			const timer = setTimeout(() => this.pingHosts(), 1000 * this.opts.pingInterval);
			timer.unref();
		});
	}

	// Master
	pingHosts() {
		/* istanbul ignore next */
		if (this.brokerStopped) return;
		/*
			Smart Ping: only ping the host, not the nodes (which may be many)

			Although, if that particular node on the host is overloaded,
			the measurement may be skewed.
		*/
		const hosts = Array.from(this.hostMap.values());

		return this.broker.Promise.all(
			hosts.map(host => {
				// TODO: missing concurency: 5, here was bluebird Promise.map
				// Select a nodeID randomly
				const nodeID = host.nodeList[random(0, host.nodeList.length - 1)];
				return this.broker.transit.sendPing(nodeID);
			})
		).then(() => {
			const timer = setTimeout(() => this.pingHosts(), 1000 * this.opts.pingInterval);
			timer.unref();
		});
	}

	// Master
	processPong(payload) {
		let node = this.registry.nodes.get(payload.nodeID);

		/* istanbul ignore next */
		if (!node) return;

		let info = this.getHostLatency(node);

		if (info.historicLatency.length > this.opts.collectCount - 1) info.historicLatency.shift();

		info.historicLatency.push(payload.elapsedTime);

		const avgLatency =
			info.historicLatency.reduce((sum, latency) => sum + latency, 0) /
			info.historicLatency.length;

		this.broker.localBus.emit("$node.latencySlave", {
			hostname: node.hostname,
			avgLatency: avgLatency
		});
	}

	// Master
	getHostLatency(node) {
		let info = this.hostMap.get(node.hostname);
		if (typeof info === "undefined") {
			info = {
				historicLatency: [],
				nodeList: [node.id]
			};
			this.hostMap.set(node.hostname, info);
		}
		return info;
	}

	// Master
	addNode(payload) {
		let node = payload.node;

		// each host may have multiple nodes
		let info = this.getHostLatency(node);
		if (info.nodeList.indexOf(node.id) === -1) {
			info.nodeList.push(node.id);
		}
	}

	// Master
	removeHostMap(payload) {
		let node = payload.node;

		let info = this.hostMap.get(node.hostname);
		// This exists to make sure that we don't get an "undefined",
		// 	therefore the test coverage here is unnecessary.
		/* istanbul ignore next */
		if (typeof info === "undefined") return;

		info.nodeList = info.nodeList.filter(id => id !== node.id);

		if (info.nodeList.length === 0) {
			// only remove the host if the last node disconnected
			this.broker.localBus.emit("$node.latencySlave.removeHost", node.hostname);
			this.hostMap.delete(node.hostname);
		}
	}

	// Master + Slave
	updateLatency(payload) {
		this.hostAvgLatency.set(payload.hostname, payload.avgLatency);
	}

	// Slave
	removeHostLatency(hostname) {
		this.hostAvgLatency.delete(hostname);
	}

	/**
	 * Select an endpoint by network latency
	 *
	 * @param {Array<Endpoint>} list
	 * @returns {Endpoint}
	 * @memberof LatencyStrategy
	 */
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
				/* istanbul ignore next */
				ep = list[random(0, list.length - 1)];
			}
			const epLatency = this.hostAvgLatency.get(ep.node.hostname);

			// Check latency of endpoint
			if (typeof epLatency !== "undefined") {
				if (epLatency < this.opts.lowLatency) return ep;

				if (!minEp || !minLatency || epLatency < minLatency) {
					minLatency = epLatency;
					minEp = ep;
				}
			}
		}

		// Return the lowest latency
		if (minEp) {
			return minEp;
		}

		// Return a random item (no latency data)
		return list[random(0, list.length - 1)];
	}
}

module.exports = LatencyStrategy;
