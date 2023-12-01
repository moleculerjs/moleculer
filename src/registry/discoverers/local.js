/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseDiscoverer = require("./base");

/**
 * Import types
 *
 * @typedef {import("./local")} LocalDiscovererClass
 * @typedef {import("./local").LocalDiscovererOptions} LocalDiscovererOptions
 */

/**
 * Local (built-in) Discoverer class
 *
 * @class Discoverer
 * @implements {LocalDiscovererClass}
 */
class LocalDiscoverer extends BaseDiscoverer {
	/**
	 * Creates an instance of Discoverer.
	 *
	 * @param {LocalDiscovererOptions?} opts
	 * @memberof LocalDiscoverer
	 */
	constructor(opts) {
		super(opts);
	}

	/**
	 * Initialize Discoverer
	 *
	 * @param {any} registry
	 *
	 * @memberof LocalDiscoverer
	 */
	init(registry) {
		super.init(registry);
	}

	/**
	 * Discover a new or old node.
	 *
	 * @param {String} nodeID
	 */
	discoverNode(nodeID) {
		if (!this.transit) return this.Promise.resolve();
		return this.transit.discoverNode(nodeID);
	}

	/**
	 * Discover all nodes (after connected)
	 */
	discoverAllNodes() {
		if (!this.transit) return this.Promise.resolve();
		return this.transit.discoverNodes();
	}

	/**
	 * Local service registry has been changed. We should notify remote nodes.
	 *
	 * @param {String=} nodeID
	 */
	sendLocalNodeInfo(nodeID) {
		if (!this.transit) return this.Promise.resolve();

		const info = this.broker.getLocalNodeInfo();

		const p =
			!nodeID && this.broker.options.disableBalancer
				? this.transit.tx.makeBalancedSubscriptions()
				: this.Promise.resolve();
		return p.then(() => this.transit.sendNodeInfo(info, nodeID));
	}
}

module.exports = LocalDiscoverer;
