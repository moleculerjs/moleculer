/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString, isInheritedClass } = require("../utils");
const { BrokerOptionsError } = require("../errors");

const Serializers = {
	Base: require("./base"),
	JSON: require("./json"),
	JSONExt: require("./json-extended"),
	MsgPack: require("./msgpack"),
	Notepack: require("./notepack"),
	CBOR: require("./cbor")
};

function getByName(name) {
	/* istanbul ignore next */
	if (!name) return null;

	let n = Object.keys(Serializers).find(n => n.toLowerCase() == name.toLowerCase());
	if (n) return Serializers[n];
}

/**
 * Resolve serializer by name
 *
 * @param {Record<string,any>|string} opt
 * @returns {any}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (isObject(opt) && isInheritedClass(opt, Serializers.Base)) {
		return opt;
	} else if (isString(opt)) {
		let SerializerClass = getByName(opt);
		if (SerializerClass) return new SerializerClass();
		else throw new BrokerOptionsError(`Invalid serializer type '${opt}'.`, { type: opt });
	} else if (isObject(opt)) {
		let SerializerClass = getByName(opt.type || "JSON");
		if (SerializerClass) return new SerializerClass(opt.options);
		else
			throw new BrokerOptionsError(`Invalid serializer type '${opt.type}'.`, {
				type: opt.type
			});
	}

	return new Serializers.JSON();
}

function register(name, value) {
	Serializers[name] = value;
}

module.exports = Object.assign(Serializers, { resolve, register });
