/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const { isObject, isString } = require("../utils");
const { BrokerOptionsError } = require("../errors");

const Serializers = {
	Base: require("./base"),
	JSON: require("./json"),
	Avro: require("./avro"),
	MsgPack: require("./msgpack"),
	ProtoBuf: require("./protobuf"),
	Thrift: require("./thrift"),
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
 * @param {object|string} opt
 * @returns {Serializer}
 * @memberof ServiceBroker
 */
function resolve(opt) {
	if (opt instanceof Serializers.Base) {
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
