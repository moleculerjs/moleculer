"use strict";

const _ = require("lodash");

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logger: console,
	nodeID: process.argv[2] || "asm-" + process.pid,
	transporter: "NATS",
});

broker.createService({
	// Agent Service Manager
	name: "asm",

	settings: {
	},

	actions: {
		info(ctx) {
			// Return info from servers, nodes, services numbers
		},

		scale(ctx) {
			// Scale up/down
		},

		autoPilotOn(ctx) {

		},

		autoPilotOff(ctx) {

		}
	},

	events: {
		"$node.connected"(payload) {

		},
		"$node.disconnected"(payload) {

		},
		"$services.changed"({ localService }) {

		}
	},

	methods: {
		buildTree() {
			/*
				[Servers]
					+ - Hostname: server-1
						+ - [Nodes]
							+ - NodeID: node-101
								+ - `math`
								+ - `users`

							+ - NodeID: node-102
								+ - `posts`
								+ - `mail`

							+ - NodeID: node-103
								+ - `posts`
								+ - `users`

					+ - Hostname: server-2
						+ - [Nodes]
						 	+ - NodeID: node-201
								+ - `users`
								+ - `likes`

							+ - NodeID: node-202
								+ - `comments`
								+ - `math`

							+ - NodeID: node-203
								+ - `users`
								+ - `mail`



			*/
		}
	},

	created() {

	}
});

broker.start().then(() => broker.repl());
