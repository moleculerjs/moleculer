"use strict";

let _ = require("lodash");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: new NatsTransporter()
	//logger: console
});

broker.start();

Promise.resolve()
.then(() => {
	setInterval(() => {
		let payload = { a: _.random(0, 100), b: _.random(0, 100) };
		let p = broker.call("math.add", payload);
		p.then(res => {
			console.info(_.padEnd(`${payload.a} + ${payload.b} = ${res}`, 15), `(from: ${p.ctx.nodeID})`);
		});
	}, 100);
});
