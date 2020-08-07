"use strict";

let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	logLevel: "debug",
	cacher: {
		type: "Redis",
		options: {
			serializer: "Notepack"
		}
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			//cache: false,
			cache: {
				enabled: true
			},
			handler(ctx) {
				return {
					a: 5,
					b: "John",
					c: true,
					d: null,
					e: {
						f: Date.now(),
						g: new Date()
					},
					h: Buffer.from("Hello")
				};
			}
		}
	}
});

broker.start()
	.then(() => broker.call("greeter.hello").then(res => broker.logger.info(res, res.e.g instanceof Date)))
	.then(() => broker.call("greeter.hello").then(res => broker.logger.info(res, res.e.g instanceof Date)))
	.catch(err => broker.logger.error(err))
	.then(() => broker.repl());
