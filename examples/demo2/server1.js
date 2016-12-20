"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let { delay } = require("../../src/utils");

let bus = require("../../src/service-bus");
let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");


// Add debug messages to bus
bus.onAny((event, value) => {
	console.log(chalk.yellow("[server-1] EVENT", event));
});

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-1",
	transporter: new NatsTransporter()
});

require("../post.service")(broker);

broker.start();

Promise.resolve()
.then(delay(100))
.then(() => {
	let startTime = Date.now();
	broker.call("posts.find").then((posts) => {
		console.log("[server-1] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
	});	
});

/*
let reqID = 123456;
setTimeout(() => {
	broker.transporter.request(broker.internalNode, reqID++, "posts.find").then(response => {
		console.log("Response: ", response.length);
	});
}, 400);

setInterval(() => {
	broker.transporter.request(broker.internalNode, reqID++, "posts.get", { id: _.random(10) }).then(response => {
		console.log("Response: ", response ? response.title : "<Not found>");
	});
}, 1000);
*/