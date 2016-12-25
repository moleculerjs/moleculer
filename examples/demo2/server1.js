"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-1",
	transporter: new NatsTransporter(),
	logger: console
});

require("../post.service")(broker);
//require("../user.service")(broker);

broker.start();
let c = 1;

Promise.resolve()
.then(delay(1000))
.then(() => {
	//setInterval(() => {
	let startTime = Date.now();
	broker.call("posts.find").then((posts) => {
		console.log("[server-1] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
	});	

	//}, 5000);
})
.then(() => {
	setInterval(() => {
		broker.emit("TEST", { a: c++ });
	}, 5000);
});
