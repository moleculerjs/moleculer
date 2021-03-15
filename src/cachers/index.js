/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString } = require("../utils");
const { BrokerOptionsError } = require("../errors");

const Cachers = {
	Base: require("./base"),
	Memory: require("./memory"),
	MemoryLRU: require("./memory-lru"),
	Redis: require("./redis")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Cachers).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Cachers[n];
}

/**
 * Resolve cacher by name
 *
 * @param {object|string} opt
 * @returns {Cacher}
 */
function resolve(opt) {
	if (opt instanceof Cachers.Base) {
		return opt;
	} else if (opt === true) {
		return new Cachers.Memory();
	} else if (isString(opt)) {
		let CacherClass = getByName(opt);
		if (CacherClass)
			return new CacherClass();

		if (opt.startsWith("redis://") || opt.startsWith("rediss://"))
			CacherClass = Cachers.Redis;

		if (CacherClass)
			return new CacherClass(opt);
		else
			throw new BrokerOptionsError(`Invalid cacher type '${opt}'.`, { type: opt });

	} else if (isObject(opt)) {
		let CacherClass = getByName(opt.type || "Memory");
		if (CacherClass)
			return new CacherClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid cacher type '${opt.type}'.`, { type: opt.type });
	}

	return null;
}

function register(name, value) {
	Cachers[name] = value;
}

module.exports = Object.assign(Cachers, { resolve, register });

