/* eslint-disable no-console */
"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let Strategies = require("../../src/strategies");
let ServiceBroker = require("../../src/service-broker");
/*
class LastHeartBeatStrategy extends Strategies.Base {
	select(list) {
		if (!this.nodes)
			this.nodes = this.broker.transit.nodes;

		let nodeID;
		let lastTime;
		this.nodes.forEach(node => {
			if (!lastTime || node.lastHeartbeatTime > lastTime) {
				nodeID = node.id;
				lastTime = node.lastHeartbeatTime;
			}
		});

		return list.find(l => l.nodeID == nodeID);
	}
}*/

// Create broker
let broker = new ServiceBroker({
	//namespace: "multi",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: "NATS",

	registry: {
		strategy: new Strategies.Random(),
	},

	circuitBreaker: {
		enabled: true,
		maxFailures: 3
	},
	logger: console
});

broker.on("$circuit-breaker.open", payload => console.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.node.id}'!`)));
broker.on("$circuit-breaker.half-open", payload => console.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.node.id}'!`)));
broker.on("$circuit-breaker.close", payload => console.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.node.id}'!`)));

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
