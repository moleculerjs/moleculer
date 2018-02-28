/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/moleculerjs/moleculer)
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

	select(/*list*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

}

module.exports = BaseStrategy;
