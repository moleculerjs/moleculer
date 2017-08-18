/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	logger: console
});

broker.createService({
	name: "event",
	events: {
		test() {
			this.logger.info("TEST event");
			return Promise.reject(new Error("Hiba!"));
		}
	}
});

broker.start().then(() => {

	/*setInterval(() => {
		broker.emit("test");

	}, 1000);*/

	broker.repl();

});
