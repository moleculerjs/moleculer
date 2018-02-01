/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { Packet } = require("../../packets");

// Packet types
const PACKET_GOSSIP_REQ		= "GOSSIP_REQ";
const PACKET_GOSSIP_RES		= "GOSSIP_RES";

/**
 * Packet for gossip request
 *
 * @class PacketGossipRequest
 * @extends {Packet}
 */
class PacketGossipRequest extends Packet {
	constructor(transit, target, data) {
		super(transit, PACKET_GOSSIP_REQ, target);

		this.payload.hostname = data.hostname;
		this.payload.port = data.port;
		this.payload.online = data.online;
		this.payload.offline = data.offline;
	}
}


module.exports = {
	PACKET_GOSSIP_REQ,
	PACKET_GOSSIP_RES,

	PacketGossipRequest
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
