"use strict";

const path = require("path");
const _ = require("lodash");
const kleur = require("kleur");
const ServiceBroker = require("../src/service-broker");
const { MoleculerError, MoleculerRetryableError } = require("../src/errors");
const Middlewares = require("../src/middlewares");

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

	//cacher: "Redis",

	registry: {
		//strategy: Strategies.Random
		discoverer: "Redis"
	},

	metrics: {
		enabled: true,
		reporter: [
			{
				type: "Console",
				options: {
					includes: "moleculer.discoverer.**",
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},
			/*{
				type: "Datadog",
				options: {
					//includes: "process.memory.**"
				}
			}*/
		]
	},
	bulkhead: {
		enabled: false
	},

	logger: console,
	logLevel: "info",
	logFormatter: "short",

	middlewares: [
		//Middlewares.Transmit.Encryption("moleculer", "aes-256-cbc"),
		//Middlewares.Transmit.Compression(),
		//Middlewares.Debugging.TransitLogger({ logPacketData: false, /*folder: null, colors: { send: "magenta", receive: "blue"}*/ }),
		//Middlewares.Debugging.ActionLogger({ logPacketData: false, /*folder: null, colors: { send: "magenta", receive: "blue"}*/ }),
		//require("./RedisHeartbeat")
	]
});

broker.createService({
	name: "math",

	actions: {
		add: {
			cache: {
				keys: ["a", "b"],
				ttl: 60
			},
			//fallback: (ctx, err) => ({ count: ctx.params.count, res: 999, fake: true }),
			//fallback: "fakeResult",
			handler(ctx) {
				const wait = _.random(500, 1500);
				this.logger.info(_.padEnd(`${ctx.meta.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.nodeID})`);
				if (_.random(100) > 80)
					return this.Promise.reject(new MoleculerRetryableError("Random error!", 510, "RANDOM_ERROR"));

				return this.Promise.resolve()./*delay(wait).*/then(() => ({
					res: Number(ctx.params.a) + Number(ctx.params.b)
				}));
			}
		},
	},

	methods: {
		fakeResult(ctx, err) {
			//this.logger.info("fakeResult", err);
			return {
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
			this.logger.warn(kleur.yellow().bold(`---  Circuit breaker opened on '${sender} -> ${payload.nodeID}:${payload.action} action'!`));
		},
		"metrics.circuit-breaker.closed"(payload, sender) {
			this.logger.warn(kleur.green().bold(`---  Circuit breaker closed on '${sender} -> ${payload.nodeID}:${payload.action} action'!`));
		},
		"metrics.trace.span.finish"(payload) {
			this.logger.info("Metrics event", payload.action.name, payload.nodeID, Number(payload.duration).toFixed(3) + " ms");
		}*/
	}
});

broker.start()
	.then(() => {
		broker.repl();
		setInterval(() => broker.ping(), 10 * 1000);
		//setInterval(() => broker.broadcast("echo.broadcast"), 5 * 1000);
	});
