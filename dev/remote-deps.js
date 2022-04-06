"use strict";

const ServiceBroker = require("../src/service-broker");
const Middlewares = require("../src/middlewares");

const broker1 = new ServiceBroker({
	nodeID: "node-1",

	transporter: "Redis",

	middlewares: [
		Middlewares.Debugging.TransitLogger({
			logPacketData: true,
			folder: null,
			colors: {
				send: "magenta",
				receive: "blue"
			},
			packetFilter: ["HEARTBEAT"]
		})
	]
});

const broker2 = new ServiceBroker({
	nodeID: "node-2",

	transporter: "Redis",

	middlewares: [
		Middlewares.Debugging.TransitLogger({
			logPacketData: true,
			folder: null,
			colors: {
				send: "magenta",
				receive: "blue"
			},
			packetFilter: ["HEARTBEAT"]
		})
	]
});

const locationSchema = {
	name: "location",

	// depends on device.service at node-2
	dependencies: ["device"],

	async started() {
		this.logger.info("Location Services started");
	}
};

const tenantSchema = {
	name: "tenant",

	async started() {
		this.logger.info("Tenant Services started");
	}
};

const assetSchema = {
	name: "device",

	// Depends on tenant.service located at node-1
	dependencies: ["tenant"],

	async started() {
		this.logger.info("Device Services started");
	}
};

// Place location.service and tenant.service at node-1
broker1.createService(locationSchema);
broker1.createService(tenantSchema);

// Place asset.service at node-2
broker2.createService(assetSchema);

Promise.all([broker1.start(), broker2.start()])
	.then(() => {
		broker1.repl();
	})
	.catch(err => console.log(err));
