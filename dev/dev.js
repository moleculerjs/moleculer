/* eslint-disable no-console */

"use strict";

let fs = require("fs");
let ServiceBroker = require("../src/service-broker");
let S = require("../src/strategies");

let broker = new ServiceBroker({
	logger: true,
	logLevel: "debug",
	registry: {
		strategy: "Random"
	},
	transporter: {
		type: "NATS",
		options: {
			nats: {
				port: 4222,
				/*tls: {
					ca: [fs.readFileSync(__dirname + "/nats-cert.pem")]
				}*/
			}
		}
	},
	cacher: {
		type: "memory",
		/*options: {
			keygen(name, params, meta, keys) {
				console.log("Keygen...");
				return "asd";
			}
		}*/
	}
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
	.then(() => broker.repl());
