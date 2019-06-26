"use strict";

const ServiceBroker = require("../src/service-broker");
const chalk = require("chalk");

const transporter = "NATS";
const serializer = "JSON";
const disableBalancer = true;

// Create broker #1
const broker1 = new ServiceBroker({
	nodeID: "broker1",
	logFormatter: "short",
	transporter,
	serializer,
	disableBalancer,
});

broker1.createService({
	name: "sender",
	actions: {
		emit(ctx) {
			ctx.meta.a = "meta-value";
			ctx.emit("user.created", { id: 5, name: "John" });

			/*
			this.logger.info(ctx.id, ctx.toJSON());
			const newCtx = ctx.copy();
			this.logger.info(newCtx.toJSON());
			*/
		}
	},

	events: {
		/*"user.created"(payload, sender, eventName, ctx) {
			this.logger.info(chalk.yellow(`${this.broker.nodeID}:${this.fullName}: Event '${eventName}' received. Payload:`), ctx ? ctx.id : null);
		}*/
		"user.created"(ctx) {
			this.logger.info(chalk.yellow(`${this.broker.nodeID}:${this.fullName}: Event '${ctx.eventName}' received. Payload:`), ctx.params, ctx.meta);
		}
	}
});

broker1.createService({
	name: "local-handler",
	events: {
		"user.created"(payload, sender, eventName, ctx) {
			this.logger.info(chalk.cyan(`${this.broker.nodeID}:${this.fullName}: Event '${eventName}' received. Payload:`), payload, ctx.meta);
		},
		/*"user.created"(ctx) {
			this.logger.info(chalk.cyan(`${this.broker.nodeID}:${this.fullName}: Event '${ctx.eventName}' received. Payload:`), ctx.params, ctx.meta);
		},*/

		"mail.sent"(ctx) {
			this.logger.info(chalk.cyan(`${this.broker.nodeID}:${this.fullName}: Event '${ctx.eventName}' received. Payload:`), ctx.params, ctx.meta);
		}
	}
});


// Create broker #2
const broker2 = new ServiceBroker({
	nodeID: "broker2",
	logFormatter: "short",
	transporter,
	serializer,
	disableBalancer,
});

const mixin = {
	events: {
		/*"user.created"(payload, sender, eventName, ctx) {
			this.logger.info(chalk.magenta(`${this.broker.nodeID}:${this.fullName}:mixin: Event '${eventName}' received. Payload:`), ctx ? ctx.id : null);
		}*/
		"user.created"(ctx) {
			this.logger.info(chalk.magenta(`${this.broker.nodeID}:${this.fullName}:mixin: Event '${ctx.eventName}' received. Payload:`), ctx.params, ctx.meta);
		}
	}
};

broker2.createService({
	name: "remote-handler",
	mixins: [mixin],
	events: {
		/*"user.created"(payload, sender, eventName, ctx) {
			this.logger.info(chalk.green(`${this.broker.nodeID}:${this.fullName}: Event '${eventName}' received. Payload:`), ctx ? ctx.id : null);
		}*/
		"user.created"(ctx) {
			this.logger.info(chalk.green(`${this.broker.nodeID}:${this.fullName}: Event '${ctx.eventName}' received. Payload:`), ctx.params, ctx.meta);
			ctx.broadcast("mail.sent", { status: "OK" });
		}
	}
});

broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(1000)
	.then(() => {
		broker1.call("sender.emit").delay(1000).then(() => broker1.repl());
	});
