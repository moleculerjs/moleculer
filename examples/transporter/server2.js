/* eslint-disable no-console */

"use strict";

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "server-2",
	transporter: "NATS",
	logger: console,
	logLevel: "info",
	serializer: "JSON"
});

//broker.loadService(__dirname + "/../post.service");
broker.loadService(__dirname + "/../user.service");


broker.start();
let c = 1;

broker.on("TEST1", a => {
	broker.logger.info("TEST1 event received:", a);
});

Promise.resolve()
	.then(delay(1000))
	.then(() => {
		let startTime = Date.now();
	
		broker.call("posts.find").then((posts) => {
			broker.logger.info("[server-2] Posts: ", posts.length, ", Time:", Date.now() - startTime, "ms");
		})
			.catch(err => broker.logger.error(err));
	})

	.then(() => {
		setInterval(() => {
			broker.emit("TEST2", { a: c++ });
			if (c >= 5) {
			//process.exit();
			}

		}, 10 * 1000);
	});
