"use strict";

let ServiceBroker = require("../src/service-broker");

let broker = new ServiceBroker({
	logger: true,
	logLevel: "debug"
});

broker.createService({
	name: "event-store",
	events: {
		"ES.**"(payload, sender, event) {
			this.store({
				event,
				payload
			}).then(() => {
				this.broker.emit(event.slice(3), payload);
			});
		}
	},

	methods: {
		store(event) {
			this.logger.info(`STORE '${event.event}' event.`);
			// Do something...
			return Promise.resolve(event);
		}
	}
});

broker.createService({
	name: "target",
	events: {
		"user.created"(payload) {
			this.logger.info("User created event RECEIVED!", payload);
		}
	}
});

broker.start().then(() => broker.emit("ES.user.created", { name: "John" }));
