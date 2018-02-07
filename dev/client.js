/* eslint-disable no-console */
"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let { MoleculerError } = require("../src/errors");
let Strategies = require("../").Strategies;

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	namespace: "",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: {
		type: "TCP",
		options: {
			broadcastAddress: "255.255.255.255",
			gossipPeriod: 5
		}
	},
	//transporter: "kafka://192.168.0.181:2181",
	//transporter: "amqp://192.168.0.181:5672",
	//serializer: "ProtoBuf",
	//requestTimeout: 1000,

	//disableBalancer: true,

	metrics: true,

	transit: {
		//maxQueueSize: 10
	},

	registry: {
		//strategy: Strategies.Random
	},

	circuitBreaker: {
		enabled: true,
		maxFailures: 3
	},
	logger: console,
	//logLevel: "debug",
	logFormatter: "simple"
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
		},

		"reply.event"(data, sender) {
			broker.logger.info(`<< Reply event received from ${sender}. Counter: ${data.counter}.`);
		},
		"echo.broadcast"(data, sender) {
			broker.logger.info(`<< Broadcast event received from ${sender}.`);
		}
	},

	started() {
		this.counter = 1;

		setInterval(() => {
			broker.logger.info(`>> Send echo event. Counter: ${this.counter}.`);
			broker.emit("echo.event", { counter: this.counter++ });
		}, 5000);
	}
});
/*
setTimeout(() => {
	broker.createService({
		name: "math",
		actions: {
			add(ctx) {
				if (_.random(100) > 90)
					return this.Promise.reject(new MoleculerError("Random error!", 510));

				return Number(ctx.params.a) + Number(ctx.params.b);
			},
		}
	});
}, 5000);*/

let reqCount = 0;
let pendingReqs = [];

broker.start()
	.then(() => broker.repl())
	.then(() => broker.waitForServices("math"))
	.then(() => {
		setInterval(() => {
			/* Overload protection
			if (broker.transit.pendingRequests.size > 10) {
				broker.logger.warn(chalk.yellow.bold(`Queue is big (${broker.transit.pendingRequests.size})! Waiting...`));
				return;
			}*/

			let pendingInfo = "";
			if (pendingReqs.length > 10) {
				pendingInfo = ` [${pendingReqs.slice(0, 10).join(",")}] + ${pendingReqs.length - 10}`;
			} else if (pendingReqs.length > 0) {
				pendingInfo = ` [${pendingReqs.join(",")}]`;
			}

			let payload = { a: _.random(0, 100), b: _.random(0, 100), count: ++reqCount };
			pendingReqs.push(reqCount);
			let p = broker.call("math.add", payload);
			if (p.ctx) {
				broker.logger.info(chalk.grey(`${reqCount}. Send request (${payload.a} + ${payload.b}) to ${p.ctx.nodeID ? p.ctx.nodeID : "some node"} (queue: ${broker.transit.pendingRequests.size})...`), chalk.yellow.bold(pendingInfo));
			}
			p.then(({ count, res }) => {
				broker.logger.info(_.padEnd(`${count}. ${payload.a} + ${payload.b} = ${res}`, 20), `(from: ${p.ctx.nodeID})`);

				// Remove from pending
				if (pendingReqs.indexOf(count) !== -1)
					pendingReqs = pendingReqs.filter(n => n != count);
				else
					broker.logger.warn(chalk.red.bold("Invalid coming request count: ", count));
			}).catch(err => {
				broker.logger.warn(chalk.red.bold(_.padEnd(`${payload.count}. ${payload.a} + ${payload.b} = ERROR! ${err.message}`)));
				if (pendingReqs.indexOf(payload.count) !== -1)
					pendingReqs = pendingReqs.filter(n => n != payload.count);
			});
		}, 1000);

	});
