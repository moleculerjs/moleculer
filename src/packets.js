/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
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

const PACKET_GOSSIP_REQ		= "GOSSIP_REQ";
const PACKET_GOSSIP_RES		= "GOSSIP_RES";

/**
 * Packet for transporters
 *
 * @class Packet
 */
class Packet {
	/**
	 * Creates an instance of Packet.
	 *
	 * @param {String} type
	 * @param {String} target
	 * @param {any} payload
	 *
	 * @memberof Packet
	 */
	constructor(type, target, payload) {
		this.type = type || PACKET_UNKNOW;
		this.target = target;
		this.payload = payload || {};
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
	PACKET_PING,
	PACKET_PONG,
	PACKET_GOSSIP_REQ,
	PACKET_GOSSIP_RES,

	Packet
};
