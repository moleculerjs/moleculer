/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString, isInheritedClass } = require("../../utils");
const { BrokerOptionsError } = require("../../errors");

const Exporters = {
	Base: require("./base"),
	Console: require("./console"),
	Datadog: require("./datadog"),
	//DatadogSimple: require("./datadog-simple"),
	Event: require("./event"),
	Jaeger: require("./jaeger"),
	Zipkin: require("./zipkin"),
	NewRelic: require("./newrelic")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name) return null;

	let n = Object.keys(Exporters).find(n => n.toLowerCase() == name.toLowerCase());
	if (n) return Exporters[n];
}

/**
 * Resolve exporter by name
 *
 * @param {Record<string,any>|string} opt
 * @returns {any}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (isObject(opt) && isInheritedClass(opt, Exporters.Base)) {
		return opt;
	} else if (isString(opt)) {
		let ExporterClass = getByName(opt);
		if (ExporterClass) return new ExporterClass();
		else throw new BrokerOptionsError(`Invalid tracing exporter type '${opt}'.`, { type: opt });
	} else if (isObject(opt)) {
		let ExporterClass = getByName(opt.type);
		if (ExporterClass) return new ExporterClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid tracing exporter type '${opt.type}'.`, {
				type: opt.type
			});
	}

	throw new BrokerOptionsError(`Invalid tracing exporter type '${opt}'.`, { type: opt });
}

function register(name, value) {
	Exporters[name] = value;
}

module.exports = Object.assign(Exporters, { resolve, register });
