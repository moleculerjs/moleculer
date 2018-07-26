"use strict";

let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "node-2",
	transporter: "NATS",
	//transporter: "amqp://192.168.51.29:5672",
	//serializer: "ProtoBuf",
	logger: console,
	logFormatter: "simple",
	circuitBreaker: {
		enabled: true,
		threshold: 0.3,
		windowTime: 30,
		minRequestCount: 5
	},
});

broker.createService({
	name: "test2",
	actions: {
		hello(ctx) {
			return ctx.call("test3.hello")
				.then(res => `Hello from ${ctx.nodeID} <- ${res}`)
				.catch(err => {
					this.logger.error(err.nodeID, err.message);
					return this.Promise.reject(err);
				});
		}
	},

	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.nodeID}'!`));
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.nodeID}'!`));
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.nodeID}'!`));
		},
	}
});

broker.start().then(() => {
	//broker.repl();
});
