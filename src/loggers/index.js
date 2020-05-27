/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString } = require("../utils");
const { BrokerOptionsError } = require("../errors");
const Base = require("./base");

const Loggers = {
	Base,
	Formatted: require("./formatted"),

	Bunyan: require("./bunyan"),
	Console: require("./console"),
	Datadog: require("./datadog"),
	Debug: require("./debug"),
	File: require("./file"),
	Log4js: require("./log4js"),
	Pino: require("./pino"),
	Winston: require("./winston"),

	LEVELS: Base.LEVELS
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Loggers).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Loggers[n];
}

/**
 * Resolve reporter by name
 *
 * @param {object|string} opt
 * @returns {Reporter}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (opt instanceof Loggers.Base) {
		return opt;
	} else if (isString(opt)) {
		let LoggerClass = getByName(opt);
		if (LoggerClass)
			return new LoggerClass();

	} else if (isObject(opt)) {
		let LoggerClass = getByName(opt.type);
		if (LoggerClass)
			return new LoggerClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid logger configuration. Type: '${opt.type}'`, { type: opt.type });
	}

	throw new BrokerOptionsError(`Invalid logger configuration: '${opt}'`, { type: opt });
}

module.exports = Object.assign(Loggers, { resolve });

