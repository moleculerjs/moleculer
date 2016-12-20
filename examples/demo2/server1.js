"use strict";

let _ = require("lodash");
let chalk = require("chalk");

let bus = require("../../src/service-bus");
let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");


// Add debug messages to bus
bus.onAny((event, value) => {
	console.log(chalk.yellow("[Event]", event));
});

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-1",
	transporter: new NatsTransporter()
});

require("../post.service")(broker);

broker.start();

setTimeout(() => {
	broker.call("posts.find").then((posts) => {
		console.log("[server-1] Posts: ", posts.length);
	});	
}, 1000);

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