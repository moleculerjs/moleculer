/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString, isInheritedClass } = require("../../utils");
const { BrokerOptionsError } = require("../../errors");

const Reporters = {
	Base: require("./base"),
	Console: require("./console"),
	CSV: require("./csv"),
	Event: require("./event"),
	Datadog: require("./datadog"),
	Prometheus: require("./prometheus"),
	StatsD: require("./statsd")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name) return null;

	let n = Object.keys(Reporters).find(n => n.toLowerCase() == name.toLowerCase());
	if (n) return Reporters[n];
}

/**
 * Resolve reporter by name
 *
 * @param {object|string} opt
 * @returns {Reporter}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (isObject(opt) && isInheritedClass(opt, Reporters.Base)) {
		return opt;
	} else if (isString(opt)) {
		let ReporterClass = getByName(opt);
		if (ReporterClass) return new ReporterClass();
	} else if (isObject(opt)) {
		let ReporterClass = getByName(opt.type);
		if (ReporterClass) return new ReporterClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid metric reporter type '${opt.type}'.`, {
				type: opt.type
			});
	}

	throw new BrokerOptionsError(`Invalid metric reporter type '${opt}'.`, { type: opt });
}

function register(name, value) {
	Reporters[name] = value;
}

module.exports = Object.assign(Reporters, { resolve, register });
