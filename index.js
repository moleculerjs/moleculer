/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const {
	STRATEGY_ROUND_ROBIN,
	STRATEGY_RANDOM,

	CIRCUIT_CLOSE, 
	CIRCUIT_HALF_OPEN, 
	CIRCUIT_OPEN
} = require("./src/constants");

module.exports = {
	Context: require("./src/context"),
	Service: require("./src/service"),
	ServiceBroker: require("./src/service-broker"),

	Transporters: require("./src/transporters"),
	Cachers: require("./src/cachers"),
	Serializers: require("./src/serializers"),

	Validator: require("./src/validator"),

	Errors: require("./src/errors"),

	STRATEGY_ROUND_ROBIN,
	STRATEGY_RANDOM,

	CIRCUIT_CLOSE, 
	CIRCUIT_HALF_OPEN, 
	CIRCUIT_OPEN
};