/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const P = require("../packets");

/**
 * Abstract serializer class
 *
 * @class Serializer
 */
class Serializer {

	/**
	 * Creates an instance of Serializer.
	 *
	 * @memberof Serializer
	 */
	constructor() {
	}

	/**
	 * Initialize Serializer
	 *
	 * @param {any} broker
	 *
	 * @memberof Serializer
	 */
	init(broker) {
		this.broker = broker;
		/*if (this.broker) {
			this.logger = broker.getLogger("serializer");
		}*/
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
	serialize(/*obj, type*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
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
	deserialize(/*buf, type*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Serialize custom fields (stringify)
	 *
	 * @param {String} type
	 * @param {Packet} obj
	 * @returns {Packet}
	 * @memberof Serializer
	 */
	serializeCustomFields(type, obj) {
		switch (type) {
			case P.PACKET_INFO: {
				obj.services = JSON.stringify(obj.services);
				if (obj.config)
					obj.config = JSON.stringify(obj.config);
				break;
			}
			case P.PACKET_EVENT: {
				if (obj.data != null)
					obj.data = JSON.stringify(obj.data);
				break;
			}
			case P.PACKET_REQUEST: {
				if (!obj.stream) {
					obj.params = JSON.stringify(obj.params);
				}
				obj.meta = JSON.stringify(obj.meta);
				break;
			}
			case P.PACKET_RESPONSE: {
				obj.meta = JSON.stringify(obj.meta);
				if (obj.data != null) {
					if (!obj.stream) {
						obj.data = JSON.stringify(obj.data);
					}

				}
				if (obj.error)
					obj.error = JSON.stringify(obj.error);
				break;
			}
			case P.PACKET_GOSSIP_REQ: {
				if (obj.online)
					obj.online = JSON.stringify(obj.online);
				if (obj.offline)
					obj.offline = JSON.stringify(obj.offline);
				break;
			}
			case P.PACKET_GOSSIP_RES: {
				if (obj.online)
					obj.online = JSON.stringify(obj.online);
				if (obj.offline)
					obj.offline = JSON.stringify(obj.offline);
				break;
			}
		}

		return obj;
	}

	/**
	 * Deserialize custom fields
	 *
	 * @param {String} type
	 * @param {Packet} obj
	 * @returns {Packet}
	 * @memberof Serializer
	 */
	deserializeCustomFields(type, obj) {
		switch (type) {
			case P.PACKET_INFO: {
				obj.services = JSON.parse(obj.services);
				if (obj.config)
					obj.config = JSON.parse(obj.config);
				break;
			}
			case P.PACKET_EVENT: {
				if (obj.data)
					obj.data = JSON.parse(obj.data);
				break;
			}
			case P.PACKET_REQUEST: {
				if (!obj.stream) {
					obj.params = JSON.parse(obj.params);
				}
				obj.meta = JSON.parse(obj.meta);
				break;
			}
			case P.PACKET_RESPONSE: {
				obj.meta = JSON.parse(obj.meta);
				if (obj.data != null) {
					if (!obj.stream) {
						obj.data = JSON.parse(obj.data);
					}
				}
				if (obj.error)
					obj.error = JSON.parse(obj.error);
				break;
			}
			case P.PACKET_GOSSIP_REQ: {
				if (obj.online)
					obj.online = JSON.parse(obj.online);
				if (obj.offline)
					obj.offline = JSON.parse(obj.offline);
				break;
			}
			case P.PACKET_GOSSIP_RES: {
				if (obj.online)
					obj.online = JSON.parse(obj.online);
				if (obj.offline)
					obj.offline = JSON.parse(obj.offline);
				break;
			}
		}

		return obj;
	}
}

module.exports = Serializer;
