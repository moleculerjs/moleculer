"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let { delay } = require("../../src/utils");

let bus = require("../../src/service-bus");
let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

/*
// Add debug messages to bus
bus.onAny((event, value) => {
	console.log(chalk.yellow("[server-1] EVENT", event));
});*/

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-1",
	transporter: new NatsTransporter()
});

require("../post.service")(broker);
//require("../user.service")(broker);
//require("../cacher.service")(broker);

broker.start();

Promise.resolve()
.then(delay(1000))
.then(() => {
	setInterval(() => {
	let startTime = Date.now();
	broker.call("posts.find").then((posts) => {
		console.log("[server-1] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
	});	

	}, 5000);
});
/*.then(delay(3000))
.then(() => {
	let startTime = Date.now();
	broker.call("users.get", { id: 5 }).then((user) => {
		console.log("[server-1] User(5): ", user.email, ", Time:", Date.now() - startTime, "ms");
	});	
});*/
