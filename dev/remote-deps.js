"use strict";

const ServiceBroker = require("../src/service-broker");
const Middlewares = require("../src/middlewares");

const brokerOptions = {
	transporter: "NATS",

	registry: {
		discoverer: "Local"
		// discoverer: "Redis"
		// discoverer: "Etcd3"
	}
};

const broker1 = new ServiceBroker({
	nodeID: "node-1",
	...brokerOptions,
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
	...brokerOptions,
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

	actions: {
		add: {
			handler(ctx) {
				return "tenant.add action";
			}
		}
	},

	async started() {
		this.logger.info("Tenant Services started");
	}
};

const deviceSchema = {
	name: "device",

	// Depends on tenant.service located at node-1
	dependencies: ["tenant"],

	async started() {
		this.logger.info("Device Services started");

		const result = await this.broker.call("tenant.add");

		this.logger.info("RESPONSE FROM TENANT =>", result);
	}
};

// Place location.service and tenant.service at node-1
broker1.createService(locationSchema);
broker1.createService(tenantSchema);

// Place asset.service at node-2
broker2.createService(deviceSchema);
/*broker2.createService({
	name: "test1",
	dependencies: ["location", "device"],
	started() {
		return this.Promise.delay(2000);
	}
});
broker2.createService({
	name: "test2",
	dependencies: ["location", "tenant"],
	started() {
		return this.Promise.delay(3000);
	}
});
broker2.createService({
	name: "test3",
	dependencies: ["tenant", "device"],
	started() {
		return this.Promise.delay(1000);
	}
});
broker2.createService({
	name: "test4",
	dependencies: ["test3"],
	started() {
		return this.Promise.delay(500);
	}
});
broker2.createService({
	name: "test5",
	started() {
		return this.Promise.delay(2500);
	}
});*/

Promise.all([broker1.start(), broker2.start()])
	.then(() => {
		broker1.repl();
	})
	.catch(err => console.log(err));
