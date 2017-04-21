"use strict";

let { delay } = require("../../src/utils");

let ServiceBroker = require("../../src/service-broker");
let FakeTransporter = require("../../src/transporters/fake");
let Serializer = require("../../src/serializers/protobuf");
// let NatsTransporter = require("../../src/transporters/nats");
// let MqttTransporter = require("../../src/transporters/mqtt");
// let RedisTransporter = require("../../src/transporters/redis");
// let FakeTransporter = require("../../src/transporters/fake");

// --- NODE 1 ---

// Create broker
let b1 = new ServiceBroker({
	nodeID: "node-1",
	transporter: new FakeTransporter(),
	//transporter: new NatsTransporter({ nats: "nats://127.0.0.1:4222"}),
	//transporter: new MqttTransporter(),
	//transporter: new RedisTransporter(),
	//transporter: new FakeTransporter(),
	serializer: new Serializer(),
	logger: console,
	//logLevel: "debug",
	logLevel: {
		"*": "error",
		"METRICS-SVC": "debug"
	},
	metrics: true,
	requestTimeout: 60 * 1000,
	//requestRetry: 3
});

b1.loadService(__dirname + "/../post.service");
b1.loadService(__dirname + "/../metrics.service");
//b1.loadService(__dirname + "/../user.service");

b1.start();

b1.createService({
	name: "nothing",
	events: {
		TEST2(a, sender) {
			console.log(`TEST2 event received from '${sender}':`, a);			
		}
	}
});
/*
b1.on("TEST2", (a, sender) => {
	console.log(`TEST2 event received from '${sender}':`, a);
});
*/
//b1.on("**", (payload, sender) => console.log(`Event from ${sender || "local"}:`, payload));


// --- NODE 2 ---
// Create broker
let b2 = new ServiceBroker({
	nodeID: "node-2",
	transporter: new FakeTransporter(),
	//transporter: new NatsTransporter({ nats: "nats://127.0.0.1:4222"}),
	//transporter: new MqttTransporter(),
	//transporter: new RedisTransporter("redis://127.0.0.1"),
	//transporter: new FakeTransporter(),
	serializer: new Serializer(),
	logger: console,
	logLevel: "warn",
	metrics: false,
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

.then(() => {
	b1.call("posts.get", { id: 1 }, { meta: { user: "John" }}).then(res => {
		console.log("[server-1] Success!", res);
	}).catch(err => {
		console.error("[server-1] Error!", err);
	});	

})


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
