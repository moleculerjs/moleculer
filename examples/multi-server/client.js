/* eslint-disable no-console */
"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let RoundRobinStrategy = require("../../src/strategies/roundrobin");
let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	//namespace: "multi",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: "NATS",

	registry: {
		strategy: new RoundRobinStrategy(),
	},

	circuitBreaker: {
		enabled: true,
		maxFailures: 3
	},
	logger: console
});

broker.on("circuit-breaker.open", payload => console.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.nodeID}'!`)));
broker.on("circuit-breaker.half-open", payload => console.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.nodeID}'!`)));
broker.on("circuit-breaker.close", payload => console.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.nodeID}'!`)));

broker.start()
	.then(() => {
		setInterval(() => {
			let payload = { a: _.random(0, 100), b: _.random(0, 100) };
			let p = broker.call("math.add", payload);
			p.then(res => {
				console.info(_.padEnd(`${payload.a} + ${payload.b} = ${res}`, 15), `(from: ${p.ctx.nodeID})`);
			}).catch(err => {
				console.warn(chalk.red.bold(_.padEnd(`${payload.a} + ${payload.b} = ERROR! ${err.message}`)));
			});
		}, 500);
	});
