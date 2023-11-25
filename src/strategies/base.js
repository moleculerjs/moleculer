/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-unused-vars */

"use strict";

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../context")} Context
 * @typedef {import("../registry")} Registry
 * @typedef {import("../registry/endpoint")} Endpoint
 * @typedef {import("./base")} BaseStrategyClass
 */

/**
 * Base strategy class
 *
 * @implements {BaseStrategyClass}
 */
class BaseStrategy {
	/**
	 * Constructor
	 *
	 * @param {Registry} registry
	 * @param {ServiceBroker} broker
	 * @param {Record<string, any>?} opts
	 */
	constructor(registry, broker, opts) {
		this.registry = registry;
		this.broker = broker;
		this.opts = opts || {};
	}

	/**
	 * Select an endpoint.
	 *
	 * @param {Endpoint[]} list
	 * @param {Context?} ctx
	 * @returns {Endpoint}
	 * @memberof BaseStrategy
	 */
	select(list, ctx) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}
}

module.exports = BaseStrategy;
