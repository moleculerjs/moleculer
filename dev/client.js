"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let { MoleculerError, MoleculerRetryableError } = require("../src/errors");
let Strategies = require("../").Strategies;
const Middlewares = require("..").Middlewares;

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	namespace: "",
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: {
		type: "NATS",
		options: {
			//udpDiscovery: false,
			//urls: "file://./dev/nodes.json",
			//debug: true
		}
	},
	//transporter: "kafka://192.168.51.29:2181",
	//transporter: "amqp://192.168.0.181:5672",
	//serializer: "MsgPack",
	//requestTimeout: 1000,

	//disableBalancer: true,

	cacher: true,

	metrics: true,

	transit: {
		//maxQueueSize: 10
	},

	registry: {
		//strategy: Strategies.Random
	},

	retryPolicy: {
		enabled: true,
		retries: 3
	},

	circuitBreaker: {
		enabled: true,
		threshold: 0.3,
		windowTime: 30,
		minRequestCount: 10
	},
	logger: console,
	logLevel: "info",
	logFormatter: "short"
});

broker.createService({
	name: "event-handler",
	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${payload.nodeID}'! (${payload.rate})`));
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(chalk.green(`---  Circuit breaker half-opened on '${payload.nodeID}'!`));
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${payload.nodeID}'!`));
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
broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			broker.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.nodeID})`);
			if (_.random(100) > 70)
				return this.Promise.reject(new MoleculerRetryableError("Random error!", 510));

			return {
				count: ctx.params.count,
				res: Number(ctx.params.a) + Number(ctx.params.b)
			};
		},
	}
});*/

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
