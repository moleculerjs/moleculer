"use strict";

let path = require("path");
let _ = require("lodash");
let chalk = require("chalk");
let ServiceBroker = require("../src/service-broker");
let { MoleculerError } = require("../src/errors");

// Create broker
let broker = new ServiceBroker({
	namespace: "",
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter: {
		type: "TCP",
		options: {
			udpDiscovery: false,
			broadcastAddress: "255.255.255.255",
			gossipPeriod: 5,
			urls: "file://./dev/nodes.json"
		}
	},
	//transporter: "kafka://192.168.0.181:2181",
	//transporter: "amqp://192.168.0.181:5672",
	//serializer: "MsgPack",

	//disableBalancer: true,

	logger: console,
	//logLevel: "debug",
	logFormatter: "simple"
});

//broker.loadService(path.join(__dirname, "..", "metrics.prometheus.service"));

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			const wait = _.random(5000, 15000);
			broker.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.callerNodeID})`);
			//if (_.random(100) > 90)
			//	return this.Promise.reject(new MoleculerError("Random error!", 510));

			return this.Promise.resolve()./*delay(wait).*/then(() => ({
				count: ctx.params.count,
				res: Number(ctx.params.a) + Number(ctx.params.b)
			}));
		},
	},

	events: {
		"echo.event"(data, sender) {
			this.logger.info(`<< MATH: Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`);
			this.broker.emit("reply.event", data);
		}
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
			this.logger.info("Metrics event", payload.action.name, payload.duration + "ms");
		}*/
	}
});

broker.start()
	.then(() => {
		setInterval(() => broker.sendPing(), 10 * 1000);
		setInterval(() => broker.broadcast("echo.broadcast"), 5 * 1000);
	})
	.then(() => broker.repl());
