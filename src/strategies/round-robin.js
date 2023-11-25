/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseStrategy = require("./base");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../registry")} Registry
 * @typedef {import("../registry/endpoint")} Endpoint
 * @typedef {import("./round-robin")} RoundRobinStrategyClass
 */

/**
 * Round-robin strategy class
 *
 * @implements {RoundRobinStrategyClass}
 */
class RoundRobinStrategy extends BaseStrategy {
	constructor(registry, broker, opts) {
		super(registry, broker, opts);

		this.counter = 0;
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
		// Reset counter
		if (this.counter >= list.length) {
			this.counter = 0;
		}
		return list[this.counter++];
	}
}

module.exports = RoundRobinStrategy;
