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
	transporter: new NatsTransporter()
});

broker.emit("test", { a: 1, b: "String"});