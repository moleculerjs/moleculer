"use strict";

const cluster = require("cluster");

process.env.TRANSPORTER = "NATS";
process.env.DISCOVERER = "Redis";
//process.env.DISCOVERER_SERIALIZER = "MsgPack";
process.env.NODE_COUNT = 2;

if (cluster.isMaster) {
	cluster.setupMaster({
		serialization: "json"
	});
	require("./master.js");

} else {
	require("./node.js");
}
