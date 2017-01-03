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

broker.loadService(__dirname + "/../post.service");
//broker.loadService(__dirname + "/../user.service");

broker.start();
let c = 1;

Promise.resolve()
.then(delay(1000))
.then(() => {
	
	let startTime = Date.now();
	broker.call("posts.find").then((posts) => {
		console.log("[server-1] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
	});	
	
})
.then(() => {
	setInterval(() => {
		broker.emit("TEST1", { a: c++ });
	}, 5000);
});
