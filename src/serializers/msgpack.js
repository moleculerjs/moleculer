/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("./msgpack")} MsgPackSerializerClass
 */

/**
 * MessagePack serializer for Moleculer
 *
 * https://github.com/mcollina/msgpack5
 *
 * @implements {MsgPackSerializerClass}
 */
class MsgPackSerializer extends BaseSerializer {
	/**
	 * Initialize Serializer
	 *
	 * @param {ServiceBroker} broker
	 *
	 * @memberof Serializer
	 */
	init(broker) {
		super.init(broker);

		try {
			this.msgpack = require("msgpack5")();
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'msgpack5' package is missing! Please install it with 'npm install msgpack5 --save' command!",
				err,
				true
			);
		}
	}

	/**
	 * Serializer a JS object to Buffer
	 *
	 * @param {Object} obj
	 * @returns {Buffer}
	 *
	 * @memberof Serializer
	 */
	serialize(obj) {
		const res = this.msgpack.encode(obj);
		return res;
	}

	/**
	 * Deserialize Buffer to JS object
	 *
	 * @param {any} buf
	 * @returns {Object}
	 *
	 * @memberof Serializer
	 */
	deserialize(buf) {
		const res = this.msgpack.decode(buf);
		return res;
	}
}

module.exports = MsgPackSerializer;
