/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	Context: require("./src/context"),
	Service: require("./src/service"),
	ServiceBroker: require("./src/service-broker"),

	Transporters: require("./src/transporters"),
	Cachers: require("./src/cachers"),
	Serializers: require("./src/serializers"),

	Validator: require("./validator"),

	Errors: require("./src/errors")
};