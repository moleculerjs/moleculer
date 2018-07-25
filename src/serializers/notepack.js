"use strict";

const BaseSerializer = require("./base");
/**
 * JSON serializer for Moleculer
 *
 * @class JSONSerializer
 */
class NotepackSerializer extends BaseSerializer {
	/**
   * Creates an instance of JSONSerializer.
   *
   * @memberof NotepackSerializer
   */
	constructor() {
		super();
		try {
			this.codec = require("notepack.io");
		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The 'notepack.io' package is missing! Please install it with 'npm install notepack.io --save' command!", err, true);
		}
	}

	/**
   * Serializer a JS object to Buffer
   *
   * @param {Object} obj
   * @param {String} type of packet
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
   * @param {Buffer} buf
   * @param {String} type of packet
   * @returns {Object}
   *
   * @memberof Serializer
   */
	deserialize(buf) {
		return this.codec.decode(buf);
	}
}

module.exports = NotepackSerializer;
