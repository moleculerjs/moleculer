/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerServerError } = require("../errors");

const Strategies = {
	Base: require("./base"),
	RoundRobin: require("./round-robin"),
	Random: require("./random"),
	CpuUsage: require("./cpu-usage"),
	Latency: require("./latency")
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
	if (Strategies.Base.isPrototypeOf(opt)) {
		return opt;
	} else if (_.isString(opt)) {
		let SerializerClass = getByName(opt);
		if (SerializerClass)
			return SerializerClass;
		else
			throw new MoleculerServerError(`Invalid strategy type '${opt}'.`, null, "INVALID_STRATEGY_TYPE", { type: opt });

	} else if (_.isObject(opt)) {
		let SerializerClass = getByName(opt.type || "RoundRobin");
		if (SerializerClass)
			return SerializerClass;
		else
			throw new MoleculerServerError(`Invalid strategy type '${opt.type}'.`, null, "INVALID_STRATEGY_TYPE", { type: opt.type });
	}

	return Strategies.RoundRobin;
}

module.exports = {
	...Strategies,
	resolve
};
