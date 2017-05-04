"use strict";

let path = require("path");

let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers").Memory;

// Create broker
let broker = new ServiceBroker({
	//cacher: new MemoryCacher(),
	nodeID: "server",
	logger: console,
	logLevel: "info",
	metrics: true,
	metricsRate: 1,
	statistics: false
});

broker.loadServices(path.join(__dirname, ".."));
broker.start();