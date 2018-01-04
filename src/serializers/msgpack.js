/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");

/**
 * MessagePack serializer for Moleculer
 * 
 * https://github.com/mcollina/msgpack5
 * 
 * @class MsgPackSerializer
 */
class MsgPackSerializer extends BaseSerializer {

	/**
	 * Initialize Serializer
	 * 
	 * @param {any} broker
	 * 
	 * @memberOf Serializer
	 */
	init(broker) {
		super.init(broker);

		try {
			this.msgpack = require("msgpack5")();
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'msgpack5' package is missing! Please install it with 'npm install msgpack5 --save' command!", err, true);
		}
	}

	/**
	 * Serializer a JS object to Buffer
	 * 
	 * @param {Object} obj
	 * @returns {Buffer}
	 * 
	 * @memberOf Serializer
	 */
	serialize(obj) {
		const res = this.msgpack.encode(obj);
		return res;
	}

	/**
	 * Deserialize Buffer to JS object
	 * 
	 * @param {Buffer} str
	 * @returns {Object}
	 * 
	 * @memberOf Serializer
	 */
	deserialize(buf) {
		const res = this.msgpack.decode(buf);
		return res;
	}
}

module.exports = MsgPackSerializer;