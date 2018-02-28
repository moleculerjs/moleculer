/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const P = require("../../packets");

module.exports = {

	PACKET_EVENT_ID: 1,
	PACKET_REQUEST_ID: 2,
	PACKET_RESPONSE_ID: 3,
	PACKET_PING_ID: 4,
	PACKET_PONG_ID: 5,
	PACKET_GOSSIP_REQ_ID: 6,
	PACKET_GOSSIP_RES_ID: 7,
	PACKET_GOSSIP_HELLO_ID: 8,

	IGNORABLE_ERRORS: [
		"ECONNREFUSED",
		"ECONNRESET",
		"ETIMEDOUT",
		"EHOSTUNREACH",
		"ENETUNREACH",
		"ENETDOWN",
		"EPIPE",
		"ENOENT"
	],

	resolvePacketID(type) {
		/* istanbul ignore next */
		switch (type) {
			case P.PACKET_EVENT:
				return module.exports.PACKET_EVENT_ID;
			case P.PACKET_REQUEST:
				return module.exports.PACKET_REQUEST_ID;
			case P.PACKET_RESPONSE:
				return module.exports.PACKET_RESPONSE_ID;
			case P.PACKET_PING:
				return module.exports.PACKET_PING_ID;
			case P.PACKET_PONG:
				return module.exports.PACKET_PONG_ID;
			case P.PACKET_GOSSIP_REQ:
				return module.exports.PACKET_GOSSIP_REQ_ID;
			case P.PACKET_GOSSIP_RES:
				return module.exports.PACKET_GOSSIP_RES_ID;
			case P.PACKET_GOSSIP_HELLO:
				return module.exports.PACKET_GOSSIP_HELLO_ID;
			default:
				throw new Error("Unsupported packet type (" + type + ")!");
		}
	},

	resolvePacketType(id) {
		/* istanbul ignore next */
		switch (id) {
			case module.exports.PACKET_EVENT_ID:
				return P.PACKET_EVENT;
			case module.exports.PACKET_REQUEST_ID:
				return P.PACKET_REQUEST;
			case module.exports.PACKET_RESPONSE_ID:
				return P.PACKET_RESPONSE;
			case module.exports.PACKET_PING_ID:
				return P.PACKET_PING;
			case module.exports.PACKET_PONG_ID:
				return P.PACKET_PONG;
			case module.exports.PACKET_GOSSIP_REQ_ID:
				return P.PACKET_GOSSIP_REQ;
			case module.exports.PACKET_GOSSIP_RES_ID:
				return P.PACKET_GOSSIP_RES;
			case module.exports.PACKET_GOSSIP_HELLO_ID:
				return P.PACKET_GOSSIP_HELLO;
			default:
				throw new Error("Unsupported packet ID (" + id + ")!");
		}
	}
};
