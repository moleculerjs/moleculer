"use strict";

const chalk = require("chalk");
const ServiceBroker = require("../src/service-broker");

const transporter = "NATS";
const serializer = "Thrift";

// Create broker #1
const broker1 = new ServiceBroker({
	nodeID: "broker-1",
	transporter,
	serializer
});

broker1.createService({
	name: "galaxy",
	actions: {
		hello(ctx) {
			this.logger.info(`The '${chalk.cyan.bold(ctx.action.name)}' action is called from '${chalk.yellow.bold(ctx.caller)}' of '${ctx.nodeID}'`);
			return ctx.call("solar.hello");
		},
	}
});

// Create broker #2
const broker2 = new ServiceBroker({
	nodeID: "broker-2",
	transporter,
	serializer
});

broker2.createService({
	name: "solar",
	actions: {
		hello(ctx) {
			this.logger.info(`The '${chalk.cyan.bold(ctx.action.name)}' action is called from '${chalk.yellow.bold(ctx.caller)}' of '${ctx.nodeID}'`);
			return ctx.call("planet.hello");
		},
	}
});

broker2.createService({
	name: "planet",
	actions: {
		hello(ctx) {
			this.logger.info(`The '${chalk.cyan.bold(ctx.action.name)}' action is called from '${chalk.yellow.bold(ctx.caller)}' of '${ctx.nodeID}'`);
		},
	}
});


broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(1000)
	.then(() => {
		broker1.repl();

		broker1.logger.info("");
		broker1.call("galaxy.hello");
	});
