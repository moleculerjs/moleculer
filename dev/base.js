/* eslint-disable no-console */

"use strict";

let ServiceBroker = require("../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	transporter: "NATS",
	logger: console,
	logLevel: "debug",
	hotReload: true
});
/*
broker.createService({
	name: "test",
	actions: {
		hello(ctx) {
			return "Hello Moleculer!";
		}
	}
});*/

broker.start().then(() => {

	setInterval(() => {
		//broker.call("test.hello")
		broker.call("math.add", { a: 5, b: 2 })
			.then(res => broker.logger.info(res))
			.catch(err => broker.logger.error(err));

	}, 1000);

	/*setTimeout(() => {
		let svc = broker.getLocalService("test");
		broker.destroyService(svc);
	}, 3000);*/

	//broker.loadService("./examples/hot.service.js");
	//broker.loadService("./examples/math.service.js");
	//broker.loadService("./examples/user.service.js");

	broker.repl();
});
