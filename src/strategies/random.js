/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { random } = require("lodash");
const BaseStrategy = require("./base");

/**
 * Random strategy class
 *
 * @class RandomStrategy
 */
class RandomStrategy extends BaseStrategy {
	select(list) {
		return list[random(0, list.length - 1)];
	}
}

module.exports = RandomStrategy;
