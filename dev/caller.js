"use strict";

const kleur = require("kleur");
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
			this.logger.info(`The '${kleur.cyan().bold(ctx.action.name)}' action is called from '${kleur.yellow().bold(ctx.caller)}' of '${ctx.nodeID}'`);
			return ctx.call("solar.hello");
		},
	},

	events: {
		async "some.thing"(ctx) {
			this.logger.info(`The '${kleur.cyan().bold(ctx.event.name)}' event is called from '${kleur.yellow().bold(ctx.caller)}' of '${ctx.nodeID}'`);
			return ctx.call("planet.welcome");
		}
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
			this.logger.info(`The '${kleur.cyan().bold(ctx.action.name)}' action is called from '${kleur.yellow().bold(ctx.caller)}' of '${ctx.nodeID}'`);
			return ctx.call("planet.hello");
		},
	}
});

broker2.createService({
	name: "planet",
	actions: {
		async hello(ctx) {
			this.logger.info(`The '${kleur.cyan().bold(ctx.action.name)}' action is called from '${kleur.yellow().bold(ctx.caller)}' of '${ctx.nodeID}'`);
			await ctx.emit("some.thing");
		},
		async welcome(ctx) {
			this.logger.info(`The '${kleur.cyan().bold(ctx.action.name)}' action is called from '${kleur.yellow().bold(ctx.caller)}' of '${ctx.nodeID}'`);
		},
	}
});


broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(1000)
	.then(async () => {
		broker1.repl();

		broker1.logger.info("");
		await broker1.call("galaxy.hello");
	});
