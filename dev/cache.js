"use strict";

let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	logLevel: "debug",
	cacher: true,
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			//cache: false,
			cache: {
				//enabled: true
				enabled: ctx => ctx.params.noCache !== true
			},
			handler(ctx) {
				this.logger.debug(chalk.yellow("Execute handler"));
				return `Hello ${ctx.params.name}`;
			}
		}
	}
});

broker.start()
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer", noCache: true }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }))
	.then(() => broker.call("greeter.hello", { name: "Moleculer" }, { meta: { $cache: false }}))

	.catch(err => broker.logger.error(err))
	.then(() => broker.stop());
