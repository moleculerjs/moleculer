/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { BrokerOptionsError } = require("../../errors");

const Types = {
	Base: require("./base"),
	Counter: require("./counter"),
	Gauge: require("./gauge"),
	Histogram: require("./histogram"),
	Info: require("./info")
};

/**
 * Get MetricType class by name.
 *
 * @param {String} name
 * @returns
 */
function getByName(name) {
	/* istanbul ignore next */
	if (name === undefined) return null;

	let converted = "Base";
	switch (name) {
		case 0:
			converted = "Info";
			break;
		case 1:
			converted = "Counter";
			break;
		case 2:
			converted = "Histogram";
			break;
		case 3:
			converted = "Gauge";
			break;
		default:
			// keep old
			converted = name;
			break;
	}

	let n = Object.keys(Types).find(n => n.toLowerCase() == converted.toLowerCase());
	if (n) return Types[n];
}

/**
 * Resolve metric type by name
 *
 * @param {string} type
 * @returns {BaseMetric}
 * @memberof ServiceBroker
 */
function resolve(type) {
	const TypeClass = getByName(type);
	if (!TypeClass) throw new BrokerOptionsError(`Invalid metric type '${type}'.`, { type });

	return TypeClass;
}

function register(name, value) {
	Types[name] = value;
}

module.exports = Object.assign(Types, { resolve, register });
