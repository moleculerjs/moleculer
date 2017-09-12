/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseStrategy = require("./base");

/**
 * Round-robin strategy class
 *
 * @class RoundRobinStrategy
 */
class RoundRobinStrategy extends BaseStrategy {

	constructor(registry, broker) {
		super(registry, broker);

		this.counter = 0;
	}

	select(list) {
		// Reset counter
		if (this.counter >= list.length) {
			this.counter = 0;
		}
		return list[this.counter++];
	}

}

module.exports = RoundRobinStrategy;
