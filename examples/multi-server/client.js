/* eslint-disable no-console */
"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let { MoleculerError } = require("../../src/errors");

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	namespace: "multi",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: "NATS",
	serializer: "ProtoBuf",
	requestTimeout: 1000,

	circuitBreaker: {
		enabled: true,
		maxFailures: 3
	},
	logger: console
});

broker.createService({
	name: "event-handler",
	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.node.id}'!`));
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.node.id}'!`));
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.node.id}'!`));
		}
	}
});

let reqCount = 0;

broker.start()
	.then(() => broker.waitForServices("math"))
	.then(() => {
		setInterval(() => {
			let payload = { a: _.random(0, 100), b: _.random(0, 100) };
			const p = broker.call("math.add", payload);
			p.then(res => {
				broker.logger.info(_.padEnd(`${reqCount}. ${payload.a} + ${payload.b} = ${res}`, 20), `(from: ${p.ctx.nodeID})`);
			}).catch(err => {
				broker.logger.warn(chalk.red.bold(_.padEnd(`${reqCount}. ${payload.a} + ${payload.b} = ERROR! ${err.message}`)));
			});
		}, 1000);

	});
