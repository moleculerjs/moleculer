/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { BrokerOptionsError } = require("../../errors");

const Exporters = {
	Base: require("./base"),
	Console: require("./console"),
	Datadog: require("./datadog"),
	Datadog2: require("./datadog2"),
	Event: require("./event"),
	EventLegacy: require("./event-legacy"),
	Jaeger: require("./jaeger"),
	Zipkin: require("./zipkin")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Exporters).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Exporters[n];
}

/**
 * Resolve exporter by name
 *
 * @param {object|string} opt
 * @returns {Exporters.Base}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (opt instanceof Exporters.Base) {
		return opt;
	} else if (_.isString(opt)) {
		let ExporterClass = getByName(opt);
		if (ExporterClass)
			return new ExporterClass();
		else
			throw new BrokerOptionsError(`Invalid tracing exporter type '${opt}'.`, { type: opt });

	} else if (_.isObject(opt)) {
		let ExporterClass = getByName(opt.type);
		if (ExporterClass)
			return new ExporterClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid tracing exporter type '${opt.type}'.`, { type: opt.type });
	}

	return null;
}

module.exports = Object.assign({ resolve }, Exporters);

