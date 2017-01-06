"use strict";

let _ = require("lodash");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "client",
	transporter: new NatsTransporter(process.env.NATS_SERVER),
	//logger: console
});

broker.start();

console.log("Client started. nodeID:", broker.nodeID, ", PID:", process.pid);

function work() {
	let payload = { a: _.random(0, 100), b: _.random(0, 100) };
	broker.call("math.add", payload)
	.then(res => {
		//console.info(`${payload.a} + ${payload.b} = ${res}`);
		process.nextTick(work);
	});		
}

setTimeout(() => { 
	work();

	setInterval(() => {
		if (broker._callCount > 0) {
			console.log(broker.nodeID, ":", broker._callCount, " req/s");
			broker._callCount = 0;
		}
	}, 1000);

}, 1000);
