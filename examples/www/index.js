"use strict";

let path = require("path");

let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers").Memory;

// Create broker
let broker = new ServiceBroker({
	//cacher: new MemoryCacher(),
	nodeID: "server",
	logger: console,
	logLevel: {
		"*": "info",
		"API-GW-SVC": "debug"
	},
	metrics: true,
	metricsRate: 1,
	statistics: true
	
});

//broker.on("metrics.**", console.log);

//broker.loadServices(path.join(__dirname, ".."));

broker.loadService(path.join(__dirname, "..", "api.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));

broker.start();