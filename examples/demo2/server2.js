"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-2",
	transporter: new NatsTransporter(),
	logger: console
});

require("../user.service")(broker);

Promise.resolve()
.then(delay(100))
.then(() => {
	broker.start();
})
.then(delay(1000))
.then(() => {
	let startTime = Date.now();
	
	broker.call("posts.find").then((posts) => {
		console.log("[server-2] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
	})
	.catch(err => console.error(err));
});
/*
.then(delay(1000))
.then(() => {
	let startTime = Date.now();
	broker.call("posts.get", { id: 3 }).then((post) => {
		console.log("[server-2] Post[3]: ", post.title, ", Time: ", Date.now() - startTime, "ms");
	})
	.catch(err => console.error(err));	
});
*/