/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

/* ****************************************
				UNSTABLE
******************************************/

"use strict";

const BaseSerializer = require("./base");

const PSON = require("pson");

const P = require("../packets");

const schemas = {};

schemas[P.PACKET_EVENT] = new PSON.ProgressivePair([
	"sender",
	"event",
	"data"
]);

schemas[P.PACKET_REQUEST] = new PSON.ProgressivePair([
	"sender",
	"requestID",
	"action",
	"params"
]);

schemas[P.PACKET_RESPONSE] = new PSON.ProgressivePair([
	"sender",
	"requestID",
	"success",
	"data",
	"error",
	"name",
	"message",
	"code"
]);

schemas[P.PACKET_DISCOVER] = new PSON.ProgressivePair([
	"sender",
	"actions"
]);

schemas[P.PACKET_INFO] = new PSON.ProgressivePair([
	"sender",
	"actions"
]);

schemas[P.PACKET_DISCONNECT] = new PSON.ProgressivePair([
	"sender"
]);

schemas[P.PACKET_HEARTBEAT] = new PSON.ProgressivePair([
	"sender"
]);

/**
 * MessagePack serializer for Moleculer
 * 
 * https://github.com/dcodeIO/PSON
 * 
 * @class PsonSerializer
 */
class PsonSerializer extends BaseSerializer {

	/**
	 * Creates an instance of PsonSerializer.
	 * 
	 * @memberOf PsonSerializer
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
		const res = schemas[type].encode(obj);
		return res;
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
		const res = schemas[type].decode(str);
		return res;
	}
}

module.exports = PsonSerializer;