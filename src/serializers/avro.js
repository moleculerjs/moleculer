/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const avro = require("avsc");
const BaseSerializer = require("./base");
const P = require("../packets");

const schemas = {};

schemas[P.PACKET_EVENT] = avro.Type.forSchema({
	name: P.PACKET_EVENT,
	type: "record",
	fields: [
		{ name: "sender", type: "string" },
		{ name: "event", type: "string" },
		{ name: "data", type: "string" }
	]
});

schemas[P.PACKET_REQUEST] = avro.Type.forSchema({
	name: P.PACKET_REQUEST,
	type: "record",
	fields: [
		{ name: "sender", type: "string" },
		{ name: "id", type: "string" },
		{ name: "action", type: "string" },
		{ name: "params", type: "string" }
	]
});

schemas[P.PACKET_RESPONSE] = avro.Type.forSchema({
	name: P.PACKET_RESPONSE,
	type: "record",
	fields: [
		{ name: "sender", type: "string" },
		{ name: "id", type: "string" },
		{ name: "success", type: "boolean" },
		{ name: "data", type: [ "null", "string"] },
		{ name: "error", type: [ "null", {
			type: "record",
			fields: [
				{ name: "name", type: "string" },
				{ name: "message", type: "string" },
				{ name: "code", type: "int" },
				{ name: "data", type: "string" }
			]
		} ], default: null }
	]
});

schemas[P.PACKET_DISCOVER] = avro.Type.forSchema({
	name: P.PACKET_DISCOVER,
	type: "record",
	fields: [
		{ name: "sender", type: "string" },
		{ name: "actions", type: "string" }
	]
});

schemas[P.PACKET_INFO] = avro.Type.forSchema({
	name: P.PACKET_INFO,
	type: "record",
	fields: [
		{ name: "sender", type: "string" },
		{ name: "actions", type: "string" }
	]
});

schemas[P.PACKET_DISCONNECT] = avro.Type.forSchema({
	name: P.PACKET_DISCONNECT,
	type: "record",
	fields: [
		{ name: "sender", type: "string" }
	]
});

schemas[P.PACKET_HEARTBEAT] = avro.Type.forSchema({
	name: P.PACKET_HEARTBEAT,
	type: "record",
	fields: [
		{ name: "sender", type: "string" }
	]
});

/**
 * Avro serializer for Moleculer
 * 
 * https://github.com/mtth/avsc
 * 
 * @class AvroSerializer
 */
class AvroSerializer extends BaseSerializer {

	/**
	 * Creates an instance of AvroSerializer.
	 * 
	 * @memberOf AvroSerializer
	 */
	constructor() {
		super();
	}

	/**
	 * Serializer a JS object to string or Buffer
	 * 
	 * @param {Object} obj
	 * @param {String} type of packet
	 * @returns {String|Buffer}
	 * 
	 * @memberOf Serializer
	 */
	serialize(obj, type) {
		//const t = schemas[type].toBuffer(obj);
		const t = schemas[type].toBuffer(obj).toString("binary");
		return t;
	}

	/**
	 * Deserialize string/Buffer to JS object
	 * 
	 * @param {String|Buffer} str
	 * @param {String} type of packet
	 * @returns {Object}
	 * 
	 * @memberOf Serializer
	 */
	deserialize(str, type) {
		//const res = schemas[type].fromBuffer(str);
		const res = schemas[type].fromBuffer(Buffer.from(str, "binary"));
		return res;
	}
}

module.exports = AvroSerializer;