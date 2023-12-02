/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString, isInheritedClass } = require("../utils");
const { BrokerOptionsError } = require("../errors");

const Transporters = {
	Base: require("./base"),
	Fake: require("./fake"),
	NATS: require("./nats"),
	MQTT: require("./mqtt"),
	Redis: require("./redis"),
	AMQP: require("./amqp"),
	AMQP10: require("./amqp10"),
	Kafka: require("./kafka"),
	TCP: require("./tcp")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name) return null;

	let n = Object.keys(Transporters).find(n => n.toLowerCase() == name.toLowerCase());
	if (n) return Transporters[n];
}

/**
 * Resolve transporter by name
 *
 * @param {Record<string,any>|string} opt
 * @returns {any}
 */
function resolve(opt) {
	if (isObject(opt) && isInheritedClass(opt, Transporters.Base)) {
		return opt;
	} else if (isString(opt)) {
		let TransporterClass = getByName(opt);
		if (TransporterClass) return new TransporterClass();

		if (opt.startsWith("nats://")) TransporterClass = Transporters.NATS;
		else if (opt.startsWith("mqtt://") || opt.startsWith("mqtts://"))
			TransporterClass = Transporters.MQTT;
		else if (opt.startsWith("redis://") || opt.startsWith("rediss://"))
			TransporterClass = Transporters.Redis;
		else if (opt.startsWith("amqp://") || opt.startsWith("amqps://"))
			TransporterClass = Transporters.AMQP;
		else if (opt.startsWith("amqp10://")) TransporterClass = Transporters.AMQP10;
		else if (opt.startsWith("kafka://")) TransporterClass = Transporters.Kafka;
		else if (opt.startsWith("tcp://")) TransporterClass = Transporters.TCP;

		if (TransporterClass) return new TransporterClass(opt);
		else throw new BrokerOptionsError(`Invalid transporter type '${opt}'.`, { type: opt });
	} else if (isObject(opt)) {
		let TransporterClass = getByName(opt.type || "NATS");

		if (TransporterClass) return new TransporterClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid transporter type '${opt.type}'.`, {
				type: opt.type
			});
	}

	return null;
}

function register(name, value) {
	Transporters[name] = value;
}

module.exports = Object.assign(Transporters, { resolve, register });
