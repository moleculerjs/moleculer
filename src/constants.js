/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {

	// Registry strategies
	STRATEGY_ROUND_ROBIN: 	1,
	STRATEGY_RANDOM: 		2,

	// Circuit-breaker states
	CIRCUIT_CLOSE: 			"close",
	CIRCUIT_HALF_OPEN: 		"half_open",
	CIRCUIT_OPEN: 			"open"

};