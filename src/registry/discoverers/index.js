/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { BrokerOptionsError } = require("../../errors");
const { isObject, isString, isInheritedClass } = require("../../utils");

const Discoverers = {
	Base: require("./base"),
	Local: require("./local"),
	Etcd3: require("./etcd3"),
	Redis: require("./redis")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name) return null;

	let n = Object.keys(Discoverers).find(n => n.toLowerCase() == name.toLowerCase());
	if (n) return Discoverers[n];
}

/**
 * Resolve discoverer by name
 *
 * @param {object|string} opt
 * @returns {Discoverer}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (isObject(opt) && isInheritedClass(opt, Discoverers.Base)) {
		return opt;
	} else if (isString(opt)) {
		let DiscovererClass = getByName(opt);
		if (DiscovererClass) return new DiscovererClass();

		if (opt.startsWith("redis://") || opt.startsWith("rediss://"))
			return new Discoverers.Redis(opt);

		if (opt.startsWith("etcd3://")) return new Discoverers.Etcd3(opt);

		throw new BrokerOptionsError(`Invalid Discoverer type '${opt}'.`, { type: opt });
	} else if (isObject(opt)) {
		let DiscovererClass = getByName(opt.type || "Local");
		if (DiscovererClass) return new DiscovererClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid Discoverer type '${opt.type}'.`, {
				type: opt.type
			});
	}

	return new Discoverers.Local();
}

function register(name, value) {
	Discoverers[name] = value;
}

module.exports = Object.assign(Discoverers, { resolve, register });
