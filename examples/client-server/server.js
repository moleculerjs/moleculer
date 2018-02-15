"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let ServiceBroker = require("../../src/service-broker");
let { MoleculerError } = require("../../src/errors");

let transporter = process.env.TRANSPORTER || "TCP";

// Create broker
let broker = new ServiceBroker({
	namespace: "multi",
	nodeID: process.argv[2] || "server-" + process.pid,
	transporter,
	serializer: "ProtoBuf",

	logger: console,
	logLevel: process.env.LOGLEVEL,
	logFormatter: "simple"
});

broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			// if (_.random(100) > 90) {
			// 	this.logger.info(chalk.bold.red("Throw random error..."));
			// 	throw new MoleculerError("Random error!", 510);
			// }

			this.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.callerNodeID})`);

			return {
				count: ctx.params.count,
				res: Number(ctx.params.a) + Number(ctx.params.b)
			};
		},
	},

	events: {
		"echo.event"(data, sender) {
			this.logger.info(`<< MATH: Echo event received from ${sender}. Counter: ${data.counter}. Send reply...`);
			this.broker.emit("reply.event", data);
		}
	}
});

broker.start()
	.then(() => {
		setInterval(() => broker.broadcast("echo.broadcast"), 5 * 1000);
		setInterval(() => {
			const fs = require("fs");
			const list = broker.registry.nodes.toArray().map(node => _.pick(node, ["id", "seq", "offlineSince", "available", "hostname", "port", "ipList", "udpAddress"]));
			fs.writeFileSync("./" + broker.nodeID + "-nodes.json", JSON.stringify(list, null, 2));
		}, 1000);
	})
	.then(() => broker.repl());
