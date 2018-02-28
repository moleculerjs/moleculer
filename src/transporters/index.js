/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	Base: require("./base"),
	Fake: require("./fake"),
	NATS: require("./nats"),
	MQTT: require("./mqtt"),
	Redis: require("./redis"),
	AMQP: require("./amqp"),
	Kafka: require("./kafka"),
	STAN: require("./stan"),
	TCP: require("./tcp")
};
