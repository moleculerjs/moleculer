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
 * @typedef {import("./notepack")} NotepackSerializerClass
 */

/**
 * Notepack serializer for Moleculer
 *
 * @implements {NotepackSerializerClass}
 */
class NotepackSerializer extends BaseSerializer {
	/**
	 * Initialize Serializer
	 *
	 * @param {any} broker
	 *
	 * @memberof Serializer
	 */
	init(broker) {
		super.init(broker);

		try {
			this.codec = require("notepack.io");
		} catch (err) {
			/* istanbul ignore next */
			this.broker.fatal(
				"The 'notepack.io' package is missing! Please install it with 'npm install notepack.io --save' command!",
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
		return this.codec.encode(obj);
	}

	/**
	 * Deserialize Buffer to JS object
	 *
	 * @param {Buffer|string} buf
	 * @returns {Object}
	 *
	 * @memberof Serializer
	 */
	deserialize(buf) {
		return this.codec.decode(buf);
	}
}

module.exports = NotepackSerializer;
