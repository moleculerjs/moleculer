/* eslint-disable no-console */

"use strict";

let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: "node-1",
	transporter: "NATS",
	//transporter: "amqp://192.168.51.29:5672",
	//serializer: "ProtoBuf",
	logger: console,
	logFormatter: "simple",
	circuitBreaker: {
		enabled: true,
		maxFailures: 1
	},
});

broker.createService({
	name: "test1",
	started() {
		setInterval(() => {
			this.logger.info("Call test2.hello");
			this.broker.call("test2.hello")
				.then(res => this.logger.info(res))
				.catch(err => this.logger.error(err.nodeID, err.message));
		}, 2000);
	},

	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.node.id}'!`));
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.node.id}'!`));
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.node.id}'!`));
		},
	}
});

broker.start().then(() => {
	//broker.repl();
});
