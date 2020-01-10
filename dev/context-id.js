"use strict";

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	logger: true,
});

broker.createService({
	name: "test",
	actions: {
		test(ctx) {
			this.logger.info("Context RequestID:", ctx.requestID);
			this.logger.info("Context ID:", ctx.id);
			this.logger.info("Context:", ctx.toJSON());
			return ctx.call("test.test2");
		},

		test2(ctx) {
			this.logger.info("Context2:", ctx.toJSON());
		}
	}
});

broker.start()
	.then(() => broker.repl())
	/*.delay(2000)
	.then(() => {
		console.log("Destroy hot service");
		broker.destroyService(svc);
	})*/
	//.delay(1000)
	.then(() => broker.call("test.test", {}, { requestID: "123456" }))
	.catch(err => broker.logger.error(err));
