/* eslint-disable no-console */

"use strict";

let fs = require("fs");
let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	logger: true,
	logLevel: "debug",
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
	// Without meta  - no cache
	.then(() => broker.call("math.add", { a: 5, b: 3 }).then(res => broker.logger.info("[No cache] 5 + 3 =", res)))
	// Without meta  - cache
	.then(() => broker.call("math.add", { a: 5, b: 3 }).then(res => broker.logger.info("[CACHED] 5 + 3 =", res)))

	// With meta  - no cache
	.then(() => broker.call("math.add", { a: 5, b: 3 }, { meta: { c: 2 }}).then(res => broker.logger.info("[No cache] 5 + 3 + 2 =", res)))
	// With meta  - cache
	.then(() => broker.call("math.add", { a: 5, b: 3 }, { meta: { c: 2 }}).then(res => broker.logger.info("[CACHED] 5 + 3 + 2 =", res)))
	// With meta  - no cache
	.then(() => broker.call("math.add", { a: 5, b: 3 }, { meta: { c: 4 }}).then(res => broker.logger.info("[No cache] 5 + 3 + 4 =", res)))

	.then(() => broker.repl());
