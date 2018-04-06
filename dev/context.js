"use strict";

const ServiceBroker = require("../src/service-broker");
const Context = require("../src/context");

class MyContext extends Context {
	throwApiError(type, data, message) {
		console.log("Helloooooo");
	}
}

const broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
	//logLevel: "debug",
	//transporter: "TCP",
	ContextFactory: MyContext
});

broker.createService({
	name: "test",
	actions: {
		test(ctx) {
			ctx.throwApiError();
		}
	}
});

broker.start()
	//.then(() => broker.repl())
	/*.delay(2000)
	.then(() => {
		console.log("Destroy hot service");
		broker.destroyService(svc);
	})*/
	//.delay(1000)
	.then(() => broker.call("test.test").then(res => broker.logger.info(res)));
