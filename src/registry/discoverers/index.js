/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { BrokerOptionsError } = require("../../errors");

const Discoverers = {
	Base: require("./base"),
	Local: require("./local"),
	Etcd3: require("./etcd3"),
	Redis: require("./redis")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Discoverers).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Discoverers[n];
}

/**
 * Resolve discoverer by name
 *
 * @param {object|string} opt
 * @returns {Discoverer}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (opt instanceof Discoverers.Base) {
		return opt;
	} else if (_.isString(opt)) {
		let DiscovererClass = getByName(opt);
		if (DiscovererClass)
			return new DiscovererClass();
		else
			throw new BrokerOptionsError(`Invalid Discoverer type '${opt}'.`, { type: opt });

	} else if (_.isObject(opt)) {
		let DiscovererClass = getByName(opt.type || "Local");
		if (DiscovererClass)
			return new DiscovererClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid Discoverer type '${opt.type}'.`, { type: opt.type });
	}

	return new Discoverers.Local();
}

module.exports = Object.assign(Discoverers, { resolve });
