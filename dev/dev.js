"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-" + process.pid,
	transporter: "NATS",
	//logLevel: "debug",
	logFormatter: "short",
});

broker.createService({
	name: "test",
	actions: {
		empty(ctx) {

		},


	}
});


broker.start()
	.then(() => broker.repl())
	.then(() => {
		setInterval(() => {
			broker.sendPing().then(res => broker.logger.info("Ping result:", res));

		}, 2500);
	});
/*.delay(1000)
	.then(() => broker.call("test.empty"))
	.then(res => broker.logger.info(res))
	.catch(err => broker.logger.error(err));*/
