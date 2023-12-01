/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
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
 * Import types
 *
 * @typedef {import("./base")} BaseMetric
 */

/**
 * Get MetricType class by name.
 *
 * @param {String} name
 * @returns
 */
function getByName(name) {
	/* istanbul ignore next */
	if (!name) return null;

	let n = Object.keys(Types).find(n => n.toLowerCase() == name.toLowerCase());
	if (n) return Types[n];
}

/**
 * Resolve metric type by name
 *
 * @param {string} type
 * @returns {any}
 * @memberof ServiceBroker
 */
function resolve(type) {
	const TypeClass = getByName(type);
	if (!TypeClass) throw new BrokerOptionsError(`Invalid metric type '${type}'.`, { type });

	return TypeClass;
}

/**
 * Register a custom metric types
 * @param {string} name
 * @param {BaseMetric} value
 */
function register(name, value) {
	Types[name] = value;
}

module.exports = Object.assign(Types, { resolve, register });
