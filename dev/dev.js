/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");

let broker1 = new ServiceBroker({
	nodeID: "node1",
	logger: true,
	logLevel: "debug",
	transporter: "NATS"
});

broker1.createService({
	name: "planets",
	metadata: {
		type: "planets"
	},
	events: {
		"$planet.earth"(payload) {
			this.logger.info(`$Earth is fired '${this.broker.nodeID}'!`);
		},
		"planet.mars"(payload) {
			this.logger.info(`Mars is fired '${this.broker.nodeID}'!`);
		},
		"$transporter.connected"(payload) {
			console.log("Transporter CONNECTED");
		}
	},
	started() {
		setInterval(() => {
			this.logger.info(`Emit on '${this.broker.nodeID}'`);
			this.broker.broadcast("$planet.earth");
			//this.broker.emit("planet.mars");
		}, 2000);
	}
});
/*
broker1.localBus.on("$planet.earth", payload => {
	console.log("Event emitted: $planet.earth");
});

broker1.localBus.on("$transporter.connected", payload => {
	console.log("Transporter CONNECTED");
});*/

// ----------------------------------------------------------------------

let broker2 = new ServiceBroker({
	nodeID: "node2",
	logger: true,
	logLevel: "debug",
	transporter: "NATS"
});

broker2.createService({
	name: "planets",
	events: {
		"$planet.earth"(payload) {
			this.logger.info(`$Earth is fired '${this.broker.nodeID}'!`);
		},
		/*"planet.mars"(payload) {
			this.logger.info(`Mars is fired '${this.broker.nodeID}'!`);
		}*/
	},
	started() {
		/*setInterval(() => {
			//this.logger.info(`Emit on '${this.broker.nodeID}'`);
			//this.broker.emit("$planet.earth");
			this.broker.emit("planet.mars");
		}, 2000);*/
	}
});

// ----------------------------------------------------------------------

broker1.Promise.resolve()
	.then(() => broker1.start())
	.then(() => broker2.start())
	.catch(err => broker1.logger.error(err))
	.then(() => broker1.repl());
