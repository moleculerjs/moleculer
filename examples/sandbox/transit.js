"use strict";

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");
let NatsTransporter = require("../../src/transporters/nats");

// --- NODE 1 ---

// Create broker
let b1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: new NatsTransporter(),
	logger: console,
	logLevel: "debug",
	//requestTimeout: 5 * 1000,
	//requestRetry: 3
});

b1.loadService(__dirname + "/../post.service");
//b1.loadService(__dirname + "/../user.service");

b1.start();

b1.on("TEST2", a => {
	console.log("TEST2 event received:", a);
});



// --- NODE 2 ---
// Create broker
let b2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: new NatsTransporter(),
	logger: console,
	logLevel: "debug",
	//requestTimeout: 5 * 1000,
	//requestRetry: 3
});

b2.loadService(__dirname + "/../user.service");

b2.start();

b2.on("TEST1", a => {
	console.log("TEST1 event received:", a);
});


// --- WORKFLOW ---

Promise.resolve()
.then(delay(1000))
/*
.then(() => {
	b1.call("v2.users.find").then(res => {
		console.log("[server-1] Success!", res.length);
	}).catch(err => {
		console.error("[server-1] Error!", err.message);
	});	

})
*/

/*
.then(() => {
	b1.call("v2.users.dangerous").catch(err => console.error(err));
});
*/


.then(() => {
	let c = 1;
	setInterval(() => {
		b2.emit("TEST2", { a: c++ });
	}, 5 * 1000);
});
