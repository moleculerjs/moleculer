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
		packet.transformPayload(payload);

		return packet;
	}

	/**
	 * Deserialize custom data in payload
	 *
	 * @param {any} payload
	 *
	 * @memberOf Packet
	 */
	transformPayload(payload) {
		this.payload = payload;
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
	constructor(transit, uptime) {
		super(transit, PACKET_HEARTBEAT);
		this.payload.uptime = uptime;
	}
}

/**
 * Packet for node discover
 *
 * @class PacketDiscover
 * @extends {Packet}
 */
class PacketDiscover extends Packet {
	constructor(transit) {
		super(transit, PACKET_DISCOVER);
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
			this.payload.services = JSON.stringify(info.services);
			this.payload.ipList = info.ipList;
			this.payload.client = info.client;
		}
	}

	transformPayload(payload) {
		super.transformPayload(payload);
		payload.services = JSON.parse(payload.services);
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
		if (data != null)
			this.payload.data = JSON.stringify(data);
		else
			this.payload.data = null;
	}

	transformPayload(payload) {
		super.transformPayload(payload);
		if (payload.data != null)
			payload.data = JSON.parse(payload.data);
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
			this.payload.params = JSON.stringify(ctx.params);
			this.payload.meta = JSON.stringify(ctx.meta);
			this.payload.timeout = ctx.timeout;
			this.payload.level = ctx.level;
			this.payload.metrics = ctx.metrics;
			this.payload.parentID = ctx.parentID;
		}
	}

	transformPayload(payload) {
		super.transformPayload(payload);
		payload.params = JSON.parse(payload.params);
		payload.meta = JSON.parse(payload.meta);
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
		this.payload.data = data != null ? JSON.stringify(data) : null;

		if (err) {
			this.payload.error = {
				name: err.name,
				message: err.message,
				nodeID: err.nodeID || this.payload.sender,
				code: err.code,
				type: err.type,
				stack: err.stack,
				data: JSON.stringify(err.data)
			};
		}
	}

	transformPayload(payload) {
		super.transformPayload(payload);
		this.payload.data = payload.data ? JSON.parse(payload.data) : null;
		if (payload.error && payload.error.data)
			this.payload.error.data = JSON.parse(payload.error.data);
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
