"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	errorHandler(err, info) {
		this.logger.warn("Error catched:", err);
	}
});

broker.createService({
	name: "mailer",
	events: {
		"send.mail": {
			params: {
				from: "string|optional",
				to: "email",
				subject: "string"
			},
			handler(ctx) {
				this.logger.info("Event received", ctx.params);
			}
		}
	}
});

broker
	.start()
	.then(() => broker.repl())
	.then(() =>
		broker.emit("send.mail", {
			to: "a@b.c"
			//subject: "Test"
		})
	);
