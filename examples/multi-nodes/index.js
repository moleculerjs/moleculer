"use strict";

const cluster = require("cluster");

process.env.TRANSPORTER = "Redis";
process.env.DISCOVERER = "Etcd3";
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
