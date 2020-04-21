/* eslint-disable no-console */

"use strict";

const cluster = require("cluster");
const ServiceBroker = require("../../src/service-broker");

function start(opts) {

	const transporter = process.env.TRANSPORTER || "NATS";

	// Create broker
	const broker = new ServiceBroker({
		namespace: process.env.NAMESPACE || "nodes",
		nodeID: opts.nodeID || "node-" + process.pid,
		transporter,
		logger: ["Console"/*, {
		type: "File",
		options: {
			// Logging level
			level: "info",
			// Folder path to save files. You can use {nodeID} & {namespace} variables.
			folder: "./logs",
			// Filename template. You can use {date}, {nodeID} & {namespace} variables.
			filename: "{nodeID}-{date}.log",
			// Line formatter. It can be "json", "short", "simple", "full", a `Function` or a template string like "{timestamp} {level} {nodeID}/{mod}: {msg}"
			formatter: "short"
		}
	}*/],
		logLevel: process.env.LOGLEVEL || "warn",
		//metrics: true,
		registry: {
			discoverer: process.env.DISCOVERER || "Redis"
		},
		//heartbeatInterval: 10,
		replCommands: [
			{
				command: "scale <count>",
				alias: "s",
				description: "Scaling up/down nodes",
				options: [
				//{ option: "--nodeID <nodeID>", description: "NodeID" }
				],
				types: {
					//number: ["service"]
				},
				action(broker, args) {
					process.send({ event: "scale", count: Number(args.count != null ? args.count : 0) });
				}
			}
		]
	});

	broker.start()
		.then(() => {
			if (cluster.worker && cluster.worker.id == 1) {
				broker.repl();
			}

			process.on("message", msg => {
				if (msg.cmd == "stop")
					return broker.stop();
			});
			process.send({ event: "started", nodeID: broker.nodeID, tx: transporter, pid: process.pid });
		});

}

process.on("message", msg => {
	console.log("[WORKER]", msg);
	if (msg.cmd == "start") {
		start(msg);
	}
});
