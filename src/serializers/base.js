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
				if (obj.metadata)
					obj.metadata = JSON.stringify(obj.metadata);
				break;
			}
			case P.PACKET_EVENT: {
				this.convertDataToTransport(obj, "data", "dataType");
				obj.meta = JSON.stringify(obj.meta);
				break;
			}
			case P.PACKET_REQUEST: {
				this.convertDataToTransport(obj, "params", "paramsType");
				obj.meta = JSON.stringify(obj.meta);
				break;
			}
			case P.PACKET_RESPONSE: {
				this.convertDataToTransport(obj, "data", "dataType");
				obj.meta = JSON.stringify(obj.meta);
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
				if (obj.metadata)
					obj.metadata = JSON.parse(obj.metadata);
				break;
			}
			case P.PACKET_EVENT: {
				this.convertDataFromTransport(obj, "data", "dataType");
				obj.meta = JSON.parse(obj.meta);
				break;
			}
			case P.PACKET_REQUEST: {
				this.convertDataFromTransport(obj, "params", "paramsType");
				obj.meta = JSON.parse(obj.meta);
				break;
			}
			case P.PACKET_RESPONSE: {
				this.convertDataFromTransport(obj, "data", "dataType");
				obj.meta = JSON.parse(obj.meta);
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

	convertDataToTransport(obj, field, fieldType) {
		if (obj[field] === undefined) {
			obj[fieldType] = P.DATATYPE_UNDEFINED;
		} else if (obj[field] === null) {
			obj[fieldType] = P.DATATYPE_NULL;
		} else if (Buffer.isBuffer(obj[field])) {
			obj[fieldType] = P.DATATYPE_BUFFER;
		} else {
			// JSON
			obj[fieldType] = P.DATATYPE_JSON;
			obj[field] = Buffer.from(JSON.stringify(obj[field]));
		}
	}

	convertDataFromTransport(obj, field, fieldType) {
		const type = obj[fieldType];
		switch(type) {
			case P.DATATYPE_UNDEFINED: {
				obj[field] = undefined;
				break;
			}
			case P.DATATYPE_NULL: {
				obj[field] = null;
				break;
			}
			case P.DATATYPE_BUFFER: {
				if (!Buffer.isBuffer(obj[field]))
					obj[field] = Buffer.from(obj[field]);
				break;
			}
			default: {
				// JSON
				obj[field] = JSON.parse(obj[field]);
				break;
			}
		}

		delete obj[fieldType];
	}
}

module.exports = Serializer;
