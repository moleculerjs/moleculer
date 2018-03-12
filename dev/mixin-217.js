"use strict";

const ServiceBroker = require("../src/service-broker");
const broker = new ServiceBroker({
	logger: true,
	internalServices: false
});

const mixin = {
	name: "mixin",
	events: {
		"user.created": {
			group: "other",
			handler(payload) {
				this.logger.info("MIXIN, OTHER, USER.CREATED");
			}
		}
	}
};

broker.createService({
	name: "svc",
	mixins: [mixin],
	/*events: {
		"user.created"(payload) {
			this.logger.info("SVC, SVC, USER.CREATED");
		}
	}*/
});

broker.start()
	.then(() => broker.repl())
	.then(() => {
		broker.broadcast("user.created", {}, "other");
	});
