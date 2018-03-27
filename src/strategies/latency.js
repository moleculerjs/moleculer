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

		// Master
		this.historicLatency = Object.create(null);
		// Slave
		this.nodeLatency = Object.create(null);

		if (this.broker.localBus.listenerCount("$node.latencyMaster") === 0) {
			this.broker.logger.debug("Latency: We are MASTER");
			this.broker.localBus.on("$node.latencyMaster", function() {});
			this.broker.localBus.on("$node.pong", this.processPong.bind(this));
			this.broker.localBus.on("$node.disconnected", this.cleanUp.bind(this));
			this.pingTimer();
		} else {
			this.broker.logger.debug("Latency: We are SLAVE");
		}

		this.broker.localBus.on("$node.latencySlave", this.updateLatency.bind(this));
	}

	// Master
	ping() {
		this.broker.logger.debug("Latency: Sending ping");
		this.broker.transit.sendPing().then(function() {
			setTimeout(this.ping.bind(this), 1000 * this.opts.pingInterval);
		}.bind(this));
	}

	// Master
	pingTimer() {
		// only one instance
		if (!this.broker.transit) return;

		this.broker.localBus.on("$broker.started", this.ping.bind(this));
	}

	// Master
	processPong(payload) {
		let nodeID = payload.nodeID;
		let avgLatency = null;

		this.broker.logger.debug("Latency: Process incoming pong");

		if (typeof this.historicLatency[nodeID] === "undefined")
			this.historicLatency[nodeID] = [];

		if (this.historicLatency[nodeID].length > (this.opts.collectCount - 1))
			this.historicLatency[nodeID].shift();

		this.historicLatency[nodeID].push(payload.elapsedTime);

		avgLatency = this.historicLatency[nodeID].reduce(function(sum, latency) {
			return sum + latency;
		}, 0) / this.historicLatency[nodeID].length;

		this.broker.logger.debug("Latency: Broadcasting latency update");

		this.broker.localBus.emit("$node.latencySlave", {
			nodeID: nodeID,
			avgLatency: avgLatency
		});
	}

	// Slave
	updateLatency(payload) {
		this.broker.logger.debug("Latency update received", payload);
		this.nodeLatency[payload.nodeID] = payload.avgLatency;
	}

	// Master & Slave
	cleanUp(payload) {
		this.broker.logger.debug("Deleting historic latency", payload.node.id);
		delete this.historicLatency[payload.node.id];
		delete this.nodeLatency[payload.node.id];
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
			const epLatency = this.nodeLatency[ep.node.id];

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
			this.broker.logger.debug("Latency: Select", minEp.node.id, minLatency);
			return minEp;
		}

		this.broker.logger.debug("Latency: Select random");

		// Return a random item (no latency data)
		return list[random(0, list.length - 1)];
	}
}

module.exports = LatencyStrategy;
