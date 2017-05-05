"use strict";

let path = require("path");

let ServiceBroker = require("../../src/service-broker");
let MemoryCacher = require("../../src/cachers").Memory;
let NatsTransporter = require("../../src/transporters").NATS;

// Create broker
let broker = new ServiceBroker({
	//cacher: new MemoryCacher(),
	//transporter: new NatsTransporter(),
	nodeID: "server",
	logger: console,
	logLevel: {
		"*": "info",
		"API-GW-SVC": "debug"
	},
	metrics: true,
	metricsRate: 1,
	statistics: true,

	validation: true
	
});

//broker.on("metrics.**", console.log);

//broker.loadServices(path.join(__dirname, ".."));

broker.loadService(path.join(__dirname, "..", "api.service"));
broker.loadService(path.join(__dirname, "..", "auth.service"));
broker.loadService(path.join(__dirname, "..", "math.service"));
broker.loadService(path.join(__dirname, "..", "file.service"));
broker.loadService(path.join(__dirname, "..", "metrics.service"));

broker.start();