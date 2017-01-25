"use strict";

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// Create broker
let broker = new ServiceBroker({
	nodeID: "server-1",
	transporter: new NatsTransporter({
		requestTimeout: 5 * 1000
	}),
	logger: console,
	logLevel: "info"	
});

broker.loadService(__dirname + "/../post.service");
//broker.loadService(__dirname + "/../user.service");

broker.start();
let c = 1;

broker.on("TEST2", a => {
	console.log("TEST2 event received:", a);
});


Promise.resolve()
//.then(delay(1000))
.then(() => {
	
	setInterval(() => {
		let startTime = Date.now();
		broker.call("posts.find").then((posts) => {
			console.log("[server-1] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
		}).catch(err => {
			console.error("[server-1] Error!", err.message);
		});	
	}, 8000);
	
})
.then(() => {
	setInterval(() => {
		broker.emit("TEST1", { a: c++ });
	}, 10 * 1000);
});
