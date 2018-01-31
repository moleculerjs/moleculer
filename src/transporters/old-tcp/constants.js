/*
 * moleculer
 * Copyright (c) 2018 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {

	PACKET_EVENT_ID: 1,
	PACKET_REQUEST_ID: 2,
	PACKET_RESPONSE_ID: 3,
	PACKET_PING_ID: 4,
	PACKET_PONG_ID: 5,
	PACKET_GOSSIP_REQ_ID: 6,
	PACKET_GOSSIP_RSP_ID: 7,

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
};
