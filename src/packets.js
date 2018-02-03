/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const E = require("./errors");


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

const PROTOCOL_VERSION 		= "3";

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
	 * @param {String} type
	 * @param {any} target
	 *
	 * @memberOf Packet
	 */
	constructor(sender, type, target) {
		this.type = type || PACKET_UNKNOW;
		this.target = target;

		this.payload = {
			ver: PROTOCOL_VERSION,
			sender
		};
	}

	/**
	 * Rebuild packet from incoming data
	 *
	 * @static
	 * @param {any} type
	 * @param {any} payload
	 * @returns {Packet}
	 *
	 * @memberOf Packet
	 */
	static build(type, payload) {
		try {
			const packetClass = getPacketClassByType(type);

			const packet = new packetClass();
			packet.payload = payload;

			return packet;
		} catch(err) {
			/* istanbul ignore next */
			throw new E.InvalidPacketData(type, payload);
		}
	}
}

/**
 * Packet for node disconnect
 *
 * @class PacketDisconnect
 * @extends {Packet}
 */
class PacketDisconnect extends Packet {
	constructor(sender) {
		super(sender, PACKET_DISCONNECT);
	}
}

/**
 * Packet for heartbeat
 *
 * @class PacketHeartbeat
 * @extends {Packet}
 */
class PacketHeartbeat extends Packet {
	constructor(sender, cpu) {
		super(sender, PACKET_HEARTBEAT);
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
	constructor(sender, target) {
		super(sender, PACKET_DISCOVER, target);
	}
}

/**
 * Packet for node info
 *
 * @class PacketInfo
 * @extends {Packet}
 */
class PacketInfo extends Packet {
	constructor(sender, target, info) {
		super(sender, PACKET_INFO, target);
		if (info) {
			this.payload.services = info.services;
			this.payload.ipList = info.ipList;
			this.payload.hostname = info.hostname;
			this.payload.client = info.client;
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
	constructor(sender, target, eventName, data = null, groups = null, broadcast = false) {
		super(sender, PACKET_EVENT, target);

		this.payload.event = eventName;
		this.payload.data = data;
		this.payload.groups = groups;
		this.payload.broadcast = broadcast;
	}
}

/**
 * Packet for request
 *
 * @class PacketRequest
 * @extends {Packet}
 */
class PacketRequest extends Packet {
	constructor(sender, target, ctx) {
		super(sender, PACKET_REQUEST, target);

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
	constructor(sender, target, id, meta, data, err) {
		super(sender, PACKET_RESPONSE, target);

		this.payload.id = id;
		this.payload.meta = meta;
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
	constructor(sender, target, time) {
		super(sender, PACKET_PING, target);
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
	constructor(sender, target, time, arrived) {
		super(sender, PACKET_PONG, target);
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
