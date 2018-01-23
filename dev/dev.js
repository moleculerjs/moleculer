/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
	//logLevel: "debug",
	transporter: "NATS",
	cacher: "memory"
});

broker.createService({
	name: "math",
	dependencies: [],
	actions: {
		add: {
			cache: {
				keys: ["a", "b", "#c"],
				ttl: 5
			},
			handler(ctx) {
				return Number(ctx.params.a) + Number(ctx.params.b) + Number(ctx.meta.c || 0);
			}
		}
	}
});

broker.loadService("examples/es6.class.service");

broker.start()
	.then(() => broker.repl())
	/*.then(() => setInterval(() => {
		broker.call("math.add", { a: 5, b: 3});
	}, 5000));*/
