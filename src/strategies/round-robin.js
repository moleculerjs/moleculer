/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
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

	constructor(registry, broker, opts) {
		super(registry, broker, opts);

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
