"use strict";

const path = require("path");
const _ = require("lodash");
const chalk = require("chalk");
const ServiceBroker = require("../src/service-broker");
const { MoleculerError, MoleculerRetryableError } = require("../src/errors");
const Middlewares = require("..").Middlewares;

// Create broker
const broker = new ServiceBroker({
	namespace: "",
	nodeID: process.argv[2] || "server-" + process.pid,
	/*transporter: {
		type: "TCP",
		options: {
			//udpDiscovery: false,
			//urls: "file://./dev/nodes.json",
			//debug: true
		}
	},
	*/
	//transporter: "kafka://192.168.0.181:9092",
	//transporter: "amqp://192.168.0.181:5672",
	transporter: "NATS",
	//serializer: "Thrift",

	//disableBalancer: true,

	//trackContext: true,

	metrics: true,

	logger: console,
	logLevel: "info",
	logFormatter: "short",

	middlewares: [
		Middlewares.Transmit.Encryption("moleculer", "aes-256-cbc"),
		Middlewares.Transmit.Compression(),
	]
});

broker.createService({
	name: "math",

	actions: {
		add: {
			fallback: (ctx, err) => ({ count: ctx.params.count, res: 999, fake: true }),
			//fallback: "fakeResult",
			handler(ctx) {
				const wait = _.random(500, 1500);
				this.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.nodeID})`);
				if (_.random(100) > 70)
					return this.Promise.reject(new MoleculerRetryableError("Random error!", 510));

				return this.Promise.resolve()./*delay(wait).*/then(() => ({
					count: ctx.params.count,
					res: Number(ctx.params.a) + Number(ctx.params.b)
				}));
			}
		},
	},

	methods: {
		fakeResult(ctx, err) {
			//this.logger.info("fakeResult", err);
			return {
				count: ctx.params.count,
				res: 999,
				fake: true
			};
		}
	},

	events: {
		"echo.event"(data, sender) {
			this.logger.info(`<< MATH: Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`);
			this.broker.emit("reply.event", data);
		}
	},

	started() {
		this.logger.info("Service started.");
	}
});

broker.createService({
	name: "metrics",
	events: {
		"$node.pong"({ nodeID, elapsedTime, timeDiff }) {
			this.logger.info(`PING '${nodeID}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms`);
		},
		/*"metrics.circuit-breaker.opened"(payload, sender) {
			this.logger.warn(chalk.yellow.bold(`---  Circuit breaker opened on '${sender} -> ${payload.nodeID}:${payload.action} action'!`));
		},
		"metrics.circuit-breaker.closed"(payload, sender) {
			this.logger.warn(chalk.green.bold(`---  Circuit breaker closed on '${sender} -> ${payload.nodeID}:${payload.action} action'!`));
		},
		"metrics.trace.span.finish"(payload) {
			this.logger.info("Metrics event", payload.action.name, payload.nodeID, Number(payload.duration).toFixed(3) + " ms");
		}*/
	}
});

broker.start()
	.then(() => {
		broker.repl();
		//setInterval(() => broker.ping(), 10 * 1000);
		//setInterval(() => broker.broadcast("echo.broadcast"), 5 * 1000);
	});
