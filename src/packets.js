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
const PACKET_PING 			= "PING";
const PACKET_PONG 			= "PONG";

const PROTOCOL_VERSION 		= "2";

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
	if (type == PACKET_PING)
		return PacketPing;
	if (type == PACKET_PONG)
		return PacketPong;

	/* istanbul ignore next */
	return Packet;
}

/**
 * Base packet
 *
 * @class Packet
 */
class Packet {
	/**
	 * Creates an instance of Packet.
	 *
	 * @param {Transit} transit
	 * @param {String} type
	 * @param {any} target
	 *
	 * @memberOf Packet
	 */
	constructor(transit, type, target) {
		this.transit = transit;
		this.type = type || PACKET_UNKNOW;
		this.target = target;

		this.payload = {
			ver: PROTOCOL_VERSION,
			sender: transit ? transit.nodeID : null
		};
	}

	/**
	 * Serialize a packet
	 *
	 * @returns
	 *
	 * @memberOf Packet
	 */
	serialize() {
		return this.transit.serialize(this.payload, this.type);
	}

	/**
	 * Deserialize message to packet
	 *
	 * @static
	 * @param {any} transit
	 * @param {any} type
	 * @param {any} msg
	 * @returns {Packet}
	 *
	 * @memberOf Packet
	 */
	static deserialize(transit, type, msg) {
		const payload = transit.deserialize(msg, type);
		const packetClass = getPacketClassByType(type);

		const packet = new packetClass(transit);
		packet.payload = payload;

		return packet;
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
	constructor(transit, cpu) {
		super(transit, PACKET_HEARTBEAT);
		this.payload.cpu = cpu;
	}
}

/**
 * Packet for node discover
 *
 * @class PacketDiscover
 * @extends {Packet}
 */
class PacketDiscover extends Packet {
	constructor(transit, target) {
		super(transit, PACKET_DISCOVER, target);
	}
}

/**
 * Packet for node info
 *
 * @class PacketInfo
 * @extends {Packet}
 */
class PacketInfo extends Packet {
	constructor(transit, target, info) {
		super(transit, PACKET_INFO, target);
		if (info) {
			this.payload.services = info.services;
			this.payload.ipList = info.ipList;
			this.payload.client = info.client;
			this.payload.port = info.port;
			this.payload.config = info.config;
		}
	}
}

/**
 * Packet for events
 *
 * @class PacketEvent
 * @extends {Packet}
 */
class PacketEvent extends Packet {
	constructor(transit, target, eventName, data = null, groups = null) {
		super(transit, PACKET_EVENT, target);

		this.payload.event = eventName;
		this.payload.data = data;
		this.payload.groups = groups;
	}
}

/**
 * Packet for request
 *
 * @class PacketRequest
 * @extends {Packet}
 */
class PacketRequest extends Packet {
	constructor(transit, target, ctx) {
		super(transit, PACKET_REQUEST, target);

		if (ctx) {
			this.payload.id = ctx.id;
			this.payload.action = ctx.action.name;
			this.payload.params = ctx.params;
			this.payload.meta = ctx.meta;
			this.payload.timeout = ctx.timeout;
			this.payload.level = ctx.level;
			this.payload.metrics = ctx.metrics;
			this.payload.parentID = ctx.parentID;
			this.payload.requestID = ctx.requestID;
		}
	}
}

/**
 * Packet for response of request
 *
 * @class PacketResponse
 * @extends {Packet}
 */
class PacketResponse extends Packet {
	constructor(transit, target, id, data, err) {
		super(transit, PACKET_RESPONSE, target);

		this.payload.id = id;
		this.payload.success = err == null;
		this.payload.data = data;

		if (err) {
			this.payload.error = {
				name: err.name,
				message: err.message,
				nodeID: err.nodeID || this.payload.sender,
				code: err.code,
				type: err.type,
				stack: err.stack,
				data: err.data
			};
		}
	}
}


/**
 * Packet for ping
 *
 * @class PacketPing
 * @extends {Packet}
 */
class PacketPing extends Packet {
	constructor(transit, target, time) {
		super(transit, PACKET_PING, target);
		this.payload.time = time;
	}
}

/**
 * Packet for pong
 *
 * @class PacketPong
 * @extends {Packet}
 */
class PacketPong extends Packet {
	constructor(transit, target, time, arrived) {
		super(transit, PACKET_PONG, target);
		this.payload.time = time;
		this.payload.arrived = arrived;
	}
}


module.exports = {
	PROTOCOL_VERSION,

	PACKET_UNKNOW,
	PACKET_EVENT,
	PACKET_REQUEST,
	PACKET_RESPONSE,
	PACKET_DISCOVER,
	PACKET_INFO,
	PACKET_DISCONNECT,
	PACKET_HEARTBEAT,
	PACKET_PING,
	PACKET_PONG,

	Packet,
	PacketEvent,
	PacketDisconnect,
	PacketDiscover,
	PacketInfo,
	PacketHeartbeat,
	PacketRequest,
	PacketResponse,
	PacketPing,
	PacketPong
};
