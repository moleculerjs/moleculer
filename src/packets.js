/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

// Packet types
const PACKET_UNKNOW			= "???";
const PACKET_EVENT 			= "EVENT";
const PACKET_REQUEST 		= "REQ";
const PACKET_RESPONSE		= "RES";
const PACKET_DISCOVER 		= "DISCOVER";
const PACKET_INFO 			= "INFO";
const PACKET_DISCONNECT 	= "DISCONNECT";
const PACKET_HEARTBEAT 		= "HEARTBEAT";

/**
 * Get packet class from packet type
 * 
 * @param {any} type 
 * @returns {Packet}
 */
function getPacketClassByType(type) {
	if (type == PACKET_EVENT)
		return PacketEvent;
	if (type == PACKET_REQUEST)
		return PacketRequest;
	if (type == PACKET_RESPONSE)
		return PacketResponse;
	if (type == PACKET_DISCOVER)
		return PacketDiscover;
	if (type == PACKET_INFO)
		return PacketInfo;
	if (type == PACKET_DISCONNECT)
		return PacketDisconnect;
	if (type == PACKET_HEARTBEAT)
		return PacketHeartbeat;

	return Packet;
}

/**
 * Base packet
 * 
 * @class Packet
 */
class Packet {
	constructor(transit, type, target) {
		this.transit = transit;
		this.type = type || PACKET_UNKNOW;
		this.target = target;

		this.payload = {
			sender: transit ? transit.nodeID : null
		};
	}

	getTopic() {
		if (this.target)
			return [this.type, this.target];
		else
			return [this.type];
	}

	serialize() {
		return this.transit.serialize(this.payload);
	}

	static deserialize(transit, type, msg) {
		const payload = transit.deserialize(msg);
		const packetClass = getPacketClassByType(type);

		const packet = new packetClass(transit);
		packet.deserializePayload(payload);

		return packet;
	}

	deserializePayload(payload) {
		this.payload = payload;
	}
} 

/**
 * Packet for events
 * 
 * @class PacketEvent
 * @extends {Packet}
 */
class PacketEvent extends Packet {
	constructor(transit, eventName, data) {
		super(transit, PACKET_EVENT);

		this.payload.event = eventName;
		this.payload.data = data;
	}
}

/**
 * Packet for node disconnect
 * 
 * @class PacketDisconnect
 * @extends {Packet}
 */
class PacketDisconnect extends Packet {
	constructor(transit) {
		super(transit, PACKET_DISCONNECT);
	}
}

/**
 * Packet for heartbeat
 * 
 * @class PacketHeartbeat
 * @extends {Packet}
 */
class PacketHeartbeat extends Packet {
	constructor(transit) {
		super(transit, PACKET_HEARTBEAT);
	}
}

/**
 * Packet for node discover
 * 
 * @class PacketDiscover
 * @extends {Packet}
 */
class PacketDiscover extends Packet {
	constructor(transit, actions) {
		super(transit, PACKET_DISCOVER);
		this.payload.actions = actions;
	}
}

/**
 * Packet for node info
 * 
 * @class PacketInfo
 * @extends {Packet}
 */
class PacketInfo extends Packet {
	constructor(transit, target, actions) {
		super(transit, PACKET_INFO, target);
		this.payload.actions = actions;
	}
}

/**
 * Packet for request
 * 
 * @class PacketRequest
 * @extends {Packet}
 */
class PacketRequest extends Packet {
	constructor(transit, target, requestID, action, params) {
		super(transit, PACKET_REQUEST, target);

		this.payload.requestID = requestID;
		this.payload.action = action;
		this.payload.params = params;
	}
}

/**
 * Packet for response of request
 * 
 * @class PacketResponse
 * @extends {Packet}
 */
class PacketResponse extends Packet {
	constructor(transit, target, requestID, data, err) {
		super(transit, PACKET_RESPONSE, target);

		this.payload.requestID = requestID;
		this.payload.success = err == null;
		this.payload.data = data;

		if (err) {
			this.payload.error = {
				name: err.name,
				message: err.message,
				code: err.code,
				data: err.data				
			};
		}
	}
}


module.exports = {
	PACKET_UNKNOW,
	PACKET_EVENT,
	PACKET_REQUEST,
	PACKET_RESPONSE,
	PACKET_DISCOVER,
	PACKET_INFO,
	PACKET_DISCONNECT,
	PACKET_HEARTBEAT,

	Packet,
	PacketEvent, 
	PacketDisconnect,
	PacketDiscover,
	PacketInfo,
	PacketHeartbeat,
	PacketRequest,
	PacketResponse
};