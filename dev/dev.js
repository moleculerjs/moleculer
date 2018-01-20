/* eslint-disable no-console */

"use strict";

let fs = require("fs");
let ServiceBroker = require("../src/service-broker");
let S = require("../src/strategies");

let broker = new ServiceBroker({
	logger: true,
	logLevel: "debug",
	transporter: "NATS",
	cacher: "memory"
});

broker.createService({
	name: "math",
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

broker.start()
	.then(() => broker.repl())
	.then(() => setInterval(() => {
		broker.call("math.add", { a: 5, b: 3});
	}, 5000));
