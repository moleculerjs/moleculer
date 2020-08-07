/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { BrokerOptionsError } = require("../errors");
const { isObject, isString } = require("../utils");

const Validators = {
	Base: require("./base"),
	Fastest: require("./fastest")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name)
		return null;

	let n = Object.keys(Validators).find(n => n.toLowerCase() == name.toLowerCase());
	if (n)
		return Validators[n];
}

/**
 * Resolve validator by name
 *
 * @param {object|string} opt
 * @returns {Validator}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (opt instanceof Validators.Base) {
		return opt;
	} else if (isString(opt)) {
		let ValidatorClass = getByName(opt);
		if (ValidatorClass)
			return new ValidatorClass();

		throw new BrokerOptionsError(`Invalid Validator type '${opt}'.`, { type: opt });

	} else if (isObject(opt)) {
		let ValidatorClass = getByName(opt.type || "Fastest");
		if (ValidatorClass)
			return new ValidatorClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid Validator type '${opt.type}'.`, { type: opt.type });
	}

	return new Validators.Fastest();
}

function register(name, value) {
	Validators[name] = value;
}

module.exports = Object.assign(Validators, { resolve, register });
