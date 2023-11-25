/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");

const { random } = require("lodash");
const BaseStrategy = require("./base");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../registry")} Registry
 * @typedef {import("../registry/endpoint")} Endpoint
 * @typedef {import("./cpu-usage")} CpuUsageStrategyClass
 * @typedef {import("./cpu-usage").CpuUsageStrategyOptions} CpuUsageStrategyOptions
 */

/**
 * Lowest CPU usage invocation strategy
 *
 * The endpoint list is not iterated completely because it can
 * very large. We get `sampleCount` samples from the list
 * and select the endpoint of the lowest CPU usage.
 * But if we found an endpoint which has lower CPU usage
 * than `lowCpuUsage` we select it.
 *
 * These options can be configured in broker registry options:
 *
 * const broker = new ServiceBroker({
 * 	logger: true,
 * 	registry: {
 * 		strategy: "CpuUsage",
 * 		strategyOptions: {
 * 			sampleCount: 5,
 * 			lowCpuUsage: 30
 * 		}
 * 	}
 * });
 *
 * @implements {CpuUsageStrategyClass}
 */
class CpuUsageStrategy extends BaseStrategy {
	/**
	 * Creates an instance of CborSerializer.
	 *
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {CpuUsageStrategyOptions} opts
	 */
	constructor(registry, broker, opts) {
		super(registry, broker, opts);

		/** @type {CpuUsageStrategyOptions} */
		this.opts = _.defaultsDeep(opts, {
			sampleCount: 3,
			lowCpuUsage: 10
		});
	}

	/**
	 * Select an endpoint.
	 *
	 * @param {Endpoint[]} list
	 *
	 * @returns {Endpoint}
	 * @memberof BaseStrategy
	 */
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
			const cpu = ep.node.cpu;

			// Check CPU usage of endpoint
			if (cpu != null) {
				if (cpu < this.opts.lowCpuUsage) return ep;

				if (!minEp || cpu < minEp.node.cpu) {
					minEp = ep;
				}
			}
		}

		// Return the lowest CPU
		if (minEp) {
			return minEp;
		}

		// Return a random item (no CPU usage data)
		return list[random(0, list.length - 1)];
	}
}

module.exports = CpuUsageStrategy;
