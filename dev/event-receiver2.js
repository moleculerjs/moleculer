/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "receiver-" + process.pid,
	transporter: "NATS",
	//serializer: "ProtoBuf",
	logger: console,
	logFormatter: "simple"
});
/*
broker.createService({
	name: "payment",
	events: {
		"user.created"(data, sender) {
			this.logger.info("PAYMENT: User created event received! ID:", data.id);
		}
	}
});*/

broker.createService({
	name: "mail",
	events: {
		"user.created": {
			handler(data, sender) {
				this.logger.info("MAIL: User created event received! ID:", data.id);
			}
		}
	}
});

broker.createService({
	name: "joker",
	events: {
		"**": {
			handler(data, sender, eventName) {
				this.logger.info(`JOKER: Event '${eventName}' received from ${sender}!`, data);
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();

	/*setTimeout(() => {
		let svc = broker.getLocalService("mail");
		broker.destroyService(svc);
	}, 30 * 1000);
	*/
});
