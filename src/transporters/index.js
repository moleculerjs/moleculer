/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { BrokerOptionsError } = require("../errors");

const Transporters = {
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

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Transporters).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Transporters[n];
}

/**
 * Resolve transporter by name
 *
 * @param {object|string} opt
 * @returns {Transporter}
 */
function resolve(opt) {
	if (opt instanceof Transporters.Base) {
		return opt;
	} else if (_.isString(opt)) {
		let TransporterClass = getByName(opt);
		if (TransporterClass)
			return new TransporterClass();

		if (opt.startsWith("nats://"))
			TransporterClass = Transporters.NATS;
		else if (opt.startsWith("mqtt://") || opt.startsWith("mqtts://"))
			TransporterClass = Transporters.MQTT;
		else if (opt.startsWith("redis://") || opt.startsWith("rediss://"))
			TransporterClass = Transporters.Redis;
		else if (opt.startsWith("amqp://") || opt.startsWith("amqps://"))
			TransporterClass = Transporters.AMQP;
		else if (opt.startsWith("kafka://"))
			TransporterClass = Transporters.Kafka;
		else if (opt.startsWith("stan://"))
			TransporterClass = Transporters.STAN;
		else if (opt.startsWith("tcp://"))
			TransporterClass = Transporters.TCP;

		if (TransporterClass)
			return new TransporterClass(opt);
		else
			throw new BrokerOptionsError(`Invalid transporter type '${opt}'.`, { type: opt });

	} else if (_.isObject(opt)) {
		let TransporterClass = getByName(opt.type || "NATS");

		if (TransporterClass)
			return new TransporterClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid transporter type '${opt.type}'.`, { type: opt.type });
	}

	return null;
}

module.exports = Object.assign({ resolve }, Transporters);
