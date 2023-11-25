/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { random } = require("lodash");
const BaseStrategy = require("./base");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../registry")} Registry
 * @typedef {import("../registry/endpoint")} Endpoint
 * @typedef {import("./random")} RandomStrategyClass
 */

/**
 * Random strategy class
 *
 * @implements {RandomStrategyClass}
 */
class RandomStrategy extends BaseStrategy {
	/**
	 * Select an endpoint.
	 *
	 * @param {Endpoint[]} list
	 *
	 * @returns {Endpoint}
	 * @memberof BaseStrategy
	 */
	select(list) {
		return list[random(0, list.length - 1)];
	}
}

module.exports = RandomStrategy;
