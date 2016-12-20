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
	nodeID: "server-2",
	transporter: new NatsTransporter()
});

// require("../user.service")(broker);

setTimeout(() => {

	broker.start();

	/*
	setTimeout(() => {
		broker.call("posts.find")
			.then((posts) => {
				console.log("[Service2] Posts: ", posts.length);
			})
			.catch(err => console.error(err));	

	}, 2000);*/
	
}, 1000);
