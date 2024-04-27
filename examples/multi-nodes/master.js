"use strict";

const path = require("path");
const cluster = require("cluster");
const ServiceBroker = require("../../src/service-broker");

const stopSignals = [
	"SIGHUP",
	"SIGINT",
	"SIGQUIT",
	"SIGILL",
	"SIGTRAP",
	"SIGABRT",
	"SIGBUS",
	"SIGFPE",
	"SIGUSR1",
	"SIGSEGV",
	"SIGUSR2",
	"SIGTERM"
];
let stopping = false;

const transporter = process.env.TRANSPORTER || "NATS";

// Create broker
const broker = new ServiceBroker({
	namespace: process.env.NAMESPACE || "nodes",
	nodeID: "master",
	transporter,
	logger: true,
	logLevel: "info",
	metrics: true,
	registry: {
		discoverer: {
			type: process.env.DISCOVERER || "Local",
			options: {
				serializer: process.env.DISCOVERER_SERIALIZER,
				monitor: false
			}
		}
	},
	//heartbeatInterval: 10,
	replOptions: {
		customCommands: [
			{
				command: "scale <count>",
				alias: "s",
				description: "Scaling up/down nodes",
				options: [
					{ option: "-k, --kill", description: "Kill nodes" }
					//{ option: "--nodeID <nodeID>", description: "NodeID" }
				],
				types: {
					//number: ["service"]
				},
				action(broker, args) {
					console.log(args);
					return broker.call("nodes.scale", {
						count: Number(args.count != null ? args.count : 0),
						kill: args.kill
					});
				}
			}
		]
	}
});

broker.loadService(path.join(__dirname, "node-controller.service.js"));

broker
	.start()
	.then(async () => {
		broker.repl();

		const nodeCount = Number(process.env.NODE_COUNT);
		if (nodeCount > 0) await broker.call("nodes.scale", { count: nodeCount });

		stopSignals.forEach(signal => {
			process.on(signal, () => {
				broker.logger.info(`Got ${signal}, stopping workers...`);
				stopping = true;
				cluster.disconnect(() => {
					broker.logger.info("All workers stopped, exiting.");
					process.exit(0);
				});
			});
		});

		await broker.Promise.delay(5000);

		broker.loadService("./examples/math.service.js");
	})
	.catch(err => broker.logger.error(err));
