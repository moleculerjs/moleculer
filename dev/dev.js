"use strict";

let ServiceBroker = require("../src/service-broker");
let Transporter = require("../src/transporters/nats");
let { CustomError } = require("../src/errors");

let broker1 = new ServiceBroker({
	nodeID: "node1",
	logger: console,
	logLevel: "info",
	transporter: new Transporter()
});

let broker2 = new ServiceBroker({
	nodeID: "node2",
	logger: console,
	logLevel: "info",
	transporter: new Transporter()
});

broker2.createService({
	name: "devil",
	actions: {
		danger(ctx) {
			throw new CustomError("Run!", 666, { a: 100 });
		}
	}
});

broker1.Promise.resolve()
.then(() => broker1.start())
.then(() => broker2.start())
.delay(500)
.then(() => broker1.call("devil.danger"))
.catch(err => console.log(err));
