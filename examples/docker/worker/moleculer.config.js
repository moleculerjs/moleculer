"use strict";

const hostname = require("os").hostname();
const fs = require("fs");
const _ = require("lodash");

let filename;

module.exports = {
	namespace: "docker",
	nodeID: `worker-${hostname}-${process.pid}`,
	logger: true,
	logLevel: "info",
	transporter: {
		type: "TCP",
		options: {
			//debug: true
		}
	},
	hotReload: true,

	started(broker) {
		filename = "./" + broker.nodeID + "-nodes.json";
		setInterval(() => {
			const list = broker.registry.nodes.toArray().map(node => _.pick(node, ["id", "seq", "offlineSince", "available", "hostname", "port", "ipList", "udpAddress"]));
			fs.writeFileSync(filename, JSON.stringify(list, null, 2));
		}, 1000);
	},

	stopped() {
		fs.unlink(filename);
	}
};
