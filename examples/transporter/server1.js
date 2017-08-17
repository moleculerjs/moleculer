/* eslint-disable no-console */

"use strict";

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || "server-1",
	transporter: "NATS",
	logger: console,
	logLevel: "info",
	requestTimeout: 5 * 1000,
	serializer: "JSON"
	//requestRetry: 3
});

broker.loadService(__dirname + "/../post.service");
//broker.loadService(__dirname + "/../user.service");

broker.start();
let c = 1;

broker.on("TEST2", a => {
	broker.logger.info("TEST2 event received:", a);
});

Promise.resolve()
	.then(delay(1000))

	.then(() => {
		broker.call("v2.users.find").then(res => {
			broker.logger.info("[server-1] Success!", res.length);
		}).catch(err => {
			broker.logger.error("[server-1] Error!", err.message);
		});

	})
/*
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
*/
	.then(() => {
	//broker.call("users.dangerous").catch(err => console.error(err));
	})

	.then(() => {
		setInterval(() => {
			broker.emit("TEST1", { a: c++ });
		}, 10 * 1000);
	});
