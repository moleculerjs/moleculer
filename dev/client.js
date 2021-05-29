"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const fs = require("fs");
const { MoleculerError, MoleculerRetryableError } = require("../src/errors");
const Middlewares = require("..").Middlewares;

const ServiceBroker = require("../src/service-broker");

// Create broker
const broker = new ServiceBroker({
	namespace: "",
	nodeID: process.argv[2] || "client-" + process.pid,
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
	//requestTimeout: 1000,

	disableBalancer: true,

	registry: {
		//strategy: Strategies.Random
		discoverer: "Etcd3"
	},

	cacher: true,

	metrics: {
		enabled: false,
		reporter: [
			/*{
				type: "Console",
				options: {
					includes: "moleculer.registry.**",
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},*/
			/*{
				type: "Prometheus",
				options: {
					port: 3031
				}
			},*/
			{
				type: "Datadog",
				options: {
					//includes: "process.memory.**"
				}
			}
		]
	},


	transit: {
		//maxQueueSize: 10
	},

	retryPolicy: {
		enabled: false,
		retries: 3
	},

	circuitBreaker: {
		enabled: false,
		threshold: 0.3,
		windowTime: 30,
		minRequestCount: 10
	},

	logger: console,
	logLevel: "info",
	middlewares: [
		//Middlewares.Transmit.Encryption("moleculer", "aes-256-cbc"),
		//Middlewares.Transmit.Compression(),
		//Middlewares.Debugging.TransitLogger({ logPacketData: false, /*folder: null, colors: { send: "magenta", receive: "blue"}*/ }),
		//Middlewares.Debugging.ActionLogger({ logParams: true, logResponse: true, /*folder: null, colors: { send: "magenta", receive: "blue"}*/ }),
		//require("./RedisHeartbeat")
	]

});

broker.createService({
	name: "event-handler",
	events: {
		"$circuit-breaker.opened"(payload) {
			broker.logger.warn(kleur.yellow().bold(`---  Circuit breaker opened on '${payload.nodeID}'! (${payload.rate})`));
		},

		"$circuit-breaker.half-opened"(payload) {
			broker.logger.warn(kleur.green(`---  Circuit breaker half-opened on '${payload.nodeID}'!`));
		},

		"$circuit-breaker.closed"(payload) {
			broker.logger.warn(kleur.green().bold(`---  Circuit breaker closed on '${payload.nodeID}'!`));
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

		const someData = JSON.parse(fs.readFileSync("./benchmark/data/10k.json", "utf8"));

		setInterval(() => {
			broker.logger.info(`>> Send echo event. Counter: ${this.counter}.`);
			broker.emit("echo.event", { counter: this.counter++/*, someData*/ });

			//broker.ping("server").then(res => broker.logger.info(res));
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
				broker.logger.warn(kleur.yellow().bold(`Queue is big (${broker.transit.pendingRequests.size})! Waiting...`));
				return;
			}*/

			let pendingInfo = "";
			if (pendingReqs.length > 10) {
				pendingInfo = ` [${pendingReqs.slice(0, 10).join(",")}] + ${pendingReqs.length - 10}`;
			} else if (pendingReqs.length > 0) {
				pendingInfo = ` [${pendingReqs.join(",")}]`;
			}

			const payload = { a: _.random(0, 10), b: _.random(0, 10) };
			const count = ++reqCount;
			pendingReqs.push(count);
			let p = broker.call("math.add", payload, { meta: { count } });
			if (p.ctx) {
				broker.logger.info(kleur.grey(`${count}. Send request (${payload.a} + ${payload.b}) to ${p.ctx.nodeID ? p.ctx.nodeID : "some node"} (queue: ${broker.transit.pendingRequests.size})...`), kleur.yellow().bold(pendingInfo));
			}
			p.then(r => {
				broker.logger.info(_.padEnd(`${count}. ${payload.a} + ${payload.b} = ${r.res}`, 20), `(from: ${p.ctx.nodeID})`);

				// Remove from pending
				if (pendingReqs.indexOf(count) !== -1)
					pendingReqs = pendingReqs.filter(n => n != count);
				else
					broker.logger.warn(kleur.red().bold("Invalid coming request count: ", count));
			}).catch(err => {
				broker.logger.warn(kleur.red().bold(_.padEnd(`${count}. ${payload.a} + ${payload.b} = ERROR! ${err.message}`)));
				if (pendingReqs.indexOf(count) !== -1)
					pendingReqs = pendingReqs.filter(n => n != count);
			});
		}, 1000);

	});
