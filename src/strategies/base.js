/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Base strategy class
 *
 * @class BaseStrategy
 */
class BaseStrategy {

	constructor(registry, broker) {
		this.registry = registry;
		this.broker = broker;
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
