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
 * The endpoint list is not iterated completely because it can
 * very large. We get `sampleCount` samples from the list
 * and select the endpoint of the lowest latency.
 * But if we found an endpoint which has lower latency
 * than `lowLatency` we select it.
 *
 * These options can be configured in broker registry options:
 *
 * const broker = new ServiceBroker({
 * 	logger: true,
 * 	registry: {
 * 		strategy: "Latency",
 * 		strategyOptions: {
 * 			sampleCount: 5,
 * 			lowLatency: 10
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
			sampleCount: 3,
			lowLatency: 10
		});
	}

	select(list) {
		let minEp = null;

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
			const latency = ep.node.latency;

			// Check latency of endpoint
			if (latency != 0) {

				if (latency < this.opts.lowLatency)
					return ep;

				if (!minEp || latency < minEp.node.latency) {
					minEp = ep;
				}
			}
		}

		// Return the lowest latancy
		if (minEp) {
			return minEp;
		}

		// Return a random item (no latancy data)
		return list[random(0, list.length - 1)];
	}
}

module.exports = LatencyStrategy;
