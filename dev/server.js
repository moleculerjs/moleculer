"use strict";

const _ = require("lodash");
const ServiceBroker = require("../src/service-broker");
const { MoleculerRetryableError } = require("../src/errors");
const { randomInt } = require("../src/utils");

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
	transporter: "kafka://localhost:9093",
	//transporter: "amqp://192.168.0.181:5672",
	//transporter: "AMQP10",
	//transporter: "NATS",
	//serializer: "MsgPack",

	//disableBalancer: true,

	//trackContext: true,

	//cacher: "Redis",

	registry: {
		//strategy: Strategies.Random
		//discoverer: "Etcd3"
	},

	metrics: {
		enabled: false,
		reporter: [
			{
				type: "Console",
				options: {
					includes: "moleculer.discoverer.**"
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			}
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

	middlewares: [
		// Middlewares.Transmit.Encryption("moleculer", "aes-256-cbc"),
		// Middlewares.Transmit.Compression()
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
				this.logger.info(
					_.padEnd(`${ctx.meta.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20),
					`(from: ${ctx.nodeID})`
				);
				if (randomInt(100) > 80)
					return this.Promise.reject(
						new MoleculerRetryableError("Random error!", 510, "RANDOM_ERROR")
					);

				return this.Promise.resolve()./*delay(wait).*/ then(() => ({
					res: Number(ctx.params.a) + Number(ctx.params.b)
				}));
			}
		}
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
			this.logger.info(
				`<< MATH: Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`
			);
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
			this.logger.info(
				`PING '${nodeID}' - Time: ${elapsedTime}ms, Time difference: ${timeDiff}ms`
			);
		}
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

broker.start().then(() => {
	broker.repl();
	setInterval(() => broker.ping(), 10 * 1000);
	//setInterval(() => broker.broadcast("echo.broadcast"), 5 * 1000);
});
