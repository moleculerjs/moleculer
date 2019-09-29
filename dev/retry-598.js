"use strict";

let ServiceBroker = require("../src/service-broker");

// --- INVOKER

const broker1 = new ServiceBroker({
	nodeID: "broker1",
	transporter: "NATS",
	retryPolicy: {
		enabled: true,
	},
	registry: {
		preferLocal: false,
	},
});

const broker2 = new ServiceBroker({
	nodeID: "broker2",
	transporter: "NATS",
	retryPolicy: {
		enabled: true,
	},
	registry: {
		preferLocal: false,
	},
});

const broker3 = new ServiceBroker({
	nodeID: "broker3",
	transporter: "NATS",
	retryPolicy: {
		enabled: true,
	},
	registry: {
		preferLocal: false,
	},
});

broker2.createService({
	name: "users",
	actions: {
		retry(ctx) {
			return ctx.call("some.made.up.action");
		}
	}
});

broker3.createService({
	name: "users",
	actions: {
		retry(ctx) {
			return ctx.call("some.made.up.action");
		}
	}
});

async function start() {
	await broker1.start();
	await broker2.start();
	await broker3.start();

	broker1.repl();

	setTimeout(() => {
		broker1.call("users.retry");
	}, 2000);
}

start();
