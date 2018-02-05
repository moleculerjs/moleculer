/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
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


/*
let REQUEST = {
	"ver": 3,
	"sender": "node-1",
	"host": "host",
	"port": 1234,
	"online": {
		"node-01": [1111, 3333, 3],  // when, cpuWhen, cpu
		"node-02": [1111, 3333, 3],  // when, cpuWhen, cpu
		"node-03": [1111, 3333, 3],  // when, cpuWhen, cpu
	},
	"offline": {
		"node-10": [1111, 2222], // when, offlineSince
		"node-11": [1111, 2222],
		"node-12": [1111, 2222]
	}
};

let RESPONSE = {
	"ver": 3,
	"sender": "node-1",
	"online": {
		"node-01": [3333, 3],   // cpuWhen, cpu
		"node-02": [{}],   // INFO
		"node-03": [{}, 3333, 3] // INFO, cpuWhen, cpu
	},
	"offline": {
		"node-10": [1111, 2222], // when, offlineSince
		"node-11": [1111, 2222],
		"node-12": [1111, 2222]
	}
};
*/
