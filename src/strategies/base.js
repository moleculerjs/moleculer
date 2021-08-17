/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Base strategy class
 *
 * @class BaseStrategy
 */
class BaseStrategy {
	/**
	 * Constructor
	 *
	 * @param {ServiceRegistry} registry
	 * @param {ServiceBroker} broker
	 * @param {Object?} opts
	 */
	constructor(registry, broker, opts) {
		this.registry = registry;
		this.broker = broker;
		this.opts = opts || {};
	}

	/**
	 * Select an endpoint.
	 *
	 * @param {Array<Endpoint>} list
	 * @param {Context?} ctx
	 *
	 * @memberof BaseStrategy
	 */
	select(/*list, ctx*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}
}

module.exports = BaseStrategy;
