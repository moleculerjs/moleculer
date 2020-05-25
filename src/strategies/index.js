/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString } = require("../utils");
const { BrokerOptionsError } = require("../errors");

const Strategies = {
	Base: require("./base"),
	RoundRobin: require("./round-robin"),
	Random: require("./random"),
	CpuUsage: require("./cpu-usage"),
	Latency: require("./latency"),
	Shard: require("./shard")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Strategies).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Strategies[n];
}

/**
 * Resolve strategy by name
 *
 * @param {object|string} opt
 * @returns {Strategy}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (Object.prototype.isPrototypeOf.call(Strategies.Base, opt)) {
		return opt;
	} else if (isString(opt)) {
		let SerializerClass = getByName(opt);
		if (SerializerClass)
			return SerializerClass;
		else
			throw new BrokerOptionsError(`Invalid strategy type '${opt}'.`, { type: opt });

	} else if (isObject(opt)) {
		let SerializerClass = getByName(opt.type || "RoundRobin");
		if (SerializerClass)
			return SerializerClass;
		else
			throw new BrokerOptionsError(`Invalid strategy type '${opt.type}'.`, { type: opt.type });
	}

	return Strategies.RoundRobin;
}

module.exports = Object.assign(Strategies, { resolve });

