"use strict";

const _ = require("lodash");
const cluster = require("cluster");
const ServiceBroker = require("../../src/service-broker");
const EventReporter = require("../../src/metrics/reporters/event");

class ProcessEventMetricReporter extends EventReporter {
	sendEvent() {
		let list = this.registry.list({
			includes: this.opts.includes,
			excludes: this.opts.excludes
		});

		if (this.opts.onlyChanges) list = list.filter(metric => this.lastChanges.has(metric.name));

		if (list.length == 0) return;

		process.send({ event: "metrics", list });

		this.lastChanges.clear();
	}
}

function start(opts) {
	const transporter = process.env.TRANSPORTER || "NATS";

	// Create broker
	const broker = new ServiceBroker({
		namespace: process.env.NAMESPACE || "nodes",
		nodeID: opts.nodeID || "node-" + process.pid,
		transporter,
		logger: [
			"Console" /*, {
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
	}*/
		],
		logLevel: process.env.LOGLEVEL || "warn",
		metrics: {
			enabled: true,
			reporter: new ProcessEventMetricReporter({
				includes: "moleculer.transporter.packets.**"
			})
		},
		//heartbeatInterval: 10,
		//heartbeatTimeout: 3 * 60,
		registry: {
			discoverer: {
				type: process.env.DISCOVERER || "Local",
				options: {
					serializer: process.env.DISCOVERER_SERIALIZER
				}
			}
		}
	});

	function sendUpdatedRegistry() {
		const nodes = {};
		broker.registry.nodes.toArray().forEach(node => {
			nodes[node.id] = _.pick(node, ["available", "seq"]);
		});

		//console.log(broker.nodeID, res);
		process.send({ event: "registry", nodes });
	}

	broker.localBus.on("$services.changed", () => sendUpdatedRegistry());
	//broker.localBus.on("$node.connected", () => sendUpdatedRegistry());
	broker.localBus.on("$node.disconnected", () => sendUpdatedRegistry());

	broker.start().then(() => {
		process.on("message", async msg => {
			if (msg.cmd == "stop") {
				await broker.stop();
				process.exit(0);
			}
		});
		process.send({
			event: "started",
			nodeID: broker.nodeID,
			tx: transporter,
			pid: process.pid
		});
	});
}

process.on("message", msg => {
	if (msg.cmd == "start") {
		start(msg);
	}
});
