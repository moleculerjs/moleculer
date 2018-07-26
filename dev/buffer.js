"use strict";

const ServiceBroker = require("../src/service-broker");
const Promise = require("bluebird");

let serializer = null;

// serializer = require('./serializer'); // NOPE
// serializer = 'Avro'; // NOPE
// serializer = "MsgPack"; // YES
serializer = "ProtoBuf"; // NOPE
// serializer = 'Thrift'; // NOPE

// Create server broker
const server = new ServiceBroker({
	namespace: "buffer",
	nodeID: "server",
	logger: true,
	logLevel: "info",
	transporter: {
		type: "TCP",
		maxPacketSize: 1 * 1024 * 1024,
	},
	requestTimeout: 5 * 1000,
	serializer,
	circuitBreaker: {
		enabled: false,
	},
	metrics: true,
	statistics: true,
	maxCallLevel: 10,
	heartbeatInterval: 2,
	heartbeatTimeout: 8,
});

server.createService({
	name: "server",
	actions: {
		getABigBuffer(ctx) {
			const {size = 128 * 1024} = ctx.params;
			return Buffer.allocUnsafe(size);
		}
	}
});


// Create client
const client = new ServiceBroker({
	namespace: "buffer",
	nodeID: "client",
	logger: true,
	logLevel: "info",
	transporter: {
		type: "TCP",
		maxPacketSize: 1 * 1024 * 1024,
	},
	requestTimeout: 5 * 1000,
	serializer,
	circuitBreaker: {
		enabled: false,
	},
	metrics: true,
	statistics: true,
	maxCallLevel: 10,
	heartbeatInterval: 2,
	heartbeatTimeout: 8,
});

Promise.all([server.start(), client.start()])
	.then(() => client.waitForServices("server"))
	.then(() => {
		client.call("server.getABigBuffer", {size: 128 * 1024}).then((res) => {
			client.logger.info("got", inspect(res));
		});
	});


function inspect(x) {
	let rv = "";
	if (x.constructor) {
		rv = x.constructor.name;
	}
	if (typeof x === "object") {
		rv += ". Keys: " + Object.keys(x).join(", ").substr(0, 80);
	}
	return rv;
}
