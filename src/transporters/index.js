/*
 * moleculer
 * Copyright (c) 2017 Icebob (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	Fake: require("./fake"),
	NATS: require("./nats"),
	MQTT: require("./mqtt"),
	Redis: require("./redis")
};