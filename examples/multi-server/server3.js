"use strict";

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-3",
	transporter: new NatsTransporter(),
	logger: console
});

broker.loadService(__dirname + "/../math.service");

broker.start();