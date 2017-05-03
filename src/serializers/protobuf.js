/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const BaseSerializer = require("./base");
const P = require("../packets");

/**
 * Protocol Buffer Serializer for Moleculer
 * 
 * https://github.com/google/protobuf
 * 
 * @class ProtoBufSerializer
 */
class ProtoBufSerializer extends BaseSerializer {

	/**
	 * Creates an instance of ProtoBufSerializer.
	 * 
	 * @memberOf ProtoBufSerializer
	 */
	constructor() {
		super();

		this.packets = require("./proto/packets.proto.js").packets;
	}

	getPacketFromType(type) {
		switch(type) {
			case P.PACKET_EVENT: return this.packets.PacketEvent;
			case P.PACKET_REQUEST: return this.packets.PacketRequest;
			case P.PACKET_RESPONSE: return this.packets.PacketResponse;
			case P.PACKET_DISCOVER: return this.packets.PacketDiscover;
			case P.PACKET_INFO: return this.packets.PacketInfo;
			case P.PACKET_DISCONNECT: return this.packets.PacketDisconnect;
			case P.PACKET_HEARTBEAT: return this.packets.PacketHeartbeat;
		}
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
		const p = this.getPacketFromType(type);	
		if (!p)
			/* istanbul ignore next */
			throw new Error("Invalid packet type!");

		const buf = p.encode(obj).finish();
		return buf.toString("binary");
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
		const p = this.getPacketFromType(type);	
		if (!p)
			/* istanbul ignore next */
			throw new Error("Invalid packet type!");

		const buf = Buffer.from(str, "binary");
		return p.decode(buf);
	}
}

module.exports = ProtoBufSerializer;