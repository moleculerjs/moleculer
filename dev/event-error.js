"use strict";

const ServiceBroker = require("../src/service-broker");
const kleur = require("kleur");

// Create broker #1
const broker = new ServiceBroker({
	middlewares: [{
		localEvent(next, handler) {
			return ctx => {
				this.logger.info("Middleware called", ctx.eventName);
				return next(ctx);/*.catch(err => {
					this.logger.info("Middleware catch error", err.message);
				});*/
			};
		}
	}],
	errorHandler(err, info) {
		broker.logger.error("Errorhandler:", err);
	}
});

broker.createService({
	name: "test",
	events: {
		"very.danger"(ctx) {
			throw new Error("Danger event!");
		}
	}
});

broker.start()
	.then(() => {
		return broker.emit("very.danger");
	})
	.catch(err => broker.logger.error("Demo error", err));
