/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Import types
 *
 * @typedef {import("./packets").Packet} PacketClass
 * @typedef {import("./packets").PacketType} PacketType
 */

// Packet types
const PACKET_UNKNOWN = "???";
const PACKET_EVENT = "EVENT";
const PACKET_REQUEST = "REQ";
const PACKET_RESPONSE = "RES";
const PACKET_DISCOVER = "DISCOVER";
const PACKET_INFO = "INFO";
const PACKET_DISCONNECT = "DISCONNECT";
const PACKET_HEARTBEAT = "HEARTBEAT";
const PACKET_PING = "PING";
const PACKET_PONG = "PONG";

const PACKET_GOSSIP_REQ = "GOSSIP_REQ";
const PACKET_GOSSIP_RES = "GOSSIP_RES";
const PACKET_GOSSIP_HELLO = "GOSSIP_HELLO";

const DATATYPE_UNDEFINED = 0;
const DATATYPE_NULL = 1;
const DATATYPE_JSON = 2;
const DATATYPE_BUFFER = 3;

/**
 * Packet for transporters
 *
 * @template T
 * @class Packet
 * @implements {PacketClass}
 */
class Packet {
	/**
	 * Creates an instance of Packet.
	 *
	 * @param {PacketType} type
	 * @param {String} target
	 * @param {T} payload
	 *
	 * @memberof Packet
	 */
	constructor(type, target, payload) {
		this.type = type || PACKET_UNKNOWN;
		this.target = target;
		this.payload = payload || {};
	}
}

module.exports = {
	PACKET_UNKNOWN,
	PACKET_EVENT,
	PACKET_REQUEST,
	PACKET_RESPONSE,
	PACKET_DISCOVER,
	PACKET_INFO,
	PACKET_DISCONNECT,
	PACKET_HEARTBEAT,
	PACKET_PING,
	PACKET_PONG,
	PACKET_GOSSIP_REQ,
	PACKET_GOSSIP_RES,
	PACKET_GOSSIP_HELLO,

	DATATYPE_UNDEFINED,
	DATATYPE_NULL,
	DATATYPE_JSON,
	DATATYPE_BUFFER,

	Packet
};
