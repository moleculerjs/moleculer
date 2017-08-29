/* eslint-disable no-console */
"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let Strategies = require("../../src/strategies");
let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	//namespace: "multi",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: "NATS",
	//serializer: "ProtoBuf",
	requestTimeout: 1000,

	registry: {
		strategy: new Strategies.RoundRobin(),
	},

	circuitBreaker: {
		enabled: true,
		maxFailures: 3
	},
	logger: console
});

broker.createService({
	name: "event-handler",
	events: {
		"$circuit-breaker.open"(payload) {
			broker.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.node.id}'!`));
		},

		"$circuit-breaker.half-open"(payload) {
			broker.logger.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.node.id}'!`));
		},

		"$circuit-breaker.close"(payload) {
			broker.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.node.id}'!`));
		},

		"reply.event"(data, sender) {
			broker.logger.info(`Reply event received from ${sender}. Counter: ${data.counter}.`);
		}
	},

	started() {
		this.counter = 1;
		setInterval(() => {
			broker.logger.info(`Send echo event to all nodes. Counter: ${this.counter}.`);
			broker.emit("echo.event", { counter: this.counter++ });
		}, 5000);
	}
});

broker.start()
	.then(() => {
		setInterval(() => {
			let payload = { a: _.random(0, 100), b: _.random(0, 100) };
			let p = broker.call("math.add", payload);
			p.then(res => {
				broker.logger.info(_.padEnd(`${payload.a} + ${payload.b} = ${res}`, 15), `(from: ${p.ctx.nodeID})`);
			}).catch(err => {
				broker.logger.warn(chalk.red.bold(_.padEnd(`${payload.a} + ${payload.b} = ERROR! ${err.message}`)));
			});
		}, 500);

	});
