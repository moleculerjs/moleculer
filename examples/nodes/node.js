/* eslint-disable no-console */

"use strict";

const cluster = require("cluster");
const ServiceBroker = require("../../src/service-broker");

const transporter = process.env.TRANSPORTER || "NATS";

// Create broker
const broker = new ServiceBroker({
	namespace: process.env.NAMESPACE || "nodes",
	nodeID: process.argv[2] || "client",
	transporter,
	logger: true,
	logLevel: process.env.LOGLEVEL || "warn",
	//metrics: true,
	registry: {
		discoverer: process.env.DISCOVERER || "Redis"
	}
});

module.exports = function start() {
	return broker.start()
		.then(() => {
			console.log("Node started:", broker.nodeID, " TX:", transporter, " PID:", process.pid);

			if (cluster.worker && cluster.worker.id == 1) {
				broker.repl();
			}
		});
};
