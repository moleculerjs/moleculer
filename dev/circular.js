"use strict";

const ServiceBroker = require("../src/service-broker");
//const { removeCircularRefs } = require("../src/utils");

// Create broker #1
const broker1 = new ServiceBroker({
	namespace: "circular",
	nodeID: "node-1",
	transporter: "NATS",
	serializer: "JSON"
});

// Create broker #2
const broker2 = new ServiceBroker({
	namespace: "circular",
	nodeID: "node-2",
	transporter: "NATS",
	serializer: "JSON"
});

const myProp = {
	a: 5,
	b: {
		c: 100
	},
	f: () => "F"
};

myProp.b.d = myProp;

broker1.createService({
	name: "test",
	actions: {
		hello: {
			myProp,
			handler(ctx) {
				return "Hello";
			}
		}
	}
});

Promise.all([broker1.start(), broker2.start()]).then(() => broker1.repl());
