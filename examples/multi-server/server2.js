"use strict";

let _ = require("lodash");

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-2",
	transporter: new NatsTransporter()
	//logger: console
});

broker.start();

Promise.resolve()
.then(() => {
	setInterval(() => {
		let payload = { a: _.random(0, 100), b: _.random(0, 100) };
		broker.call("math.add", payload)
		.then(res => {
			console.info(`${payload.a} + ${payload.b} = ${res}`);
		});
	}, 100);
});
