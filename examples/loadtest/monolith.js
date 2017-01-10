"use strict";

let _ = require("lodash");
let os = require("os");
let hostname = os.hostname();

let ServiceBroker = require("../../src/service-broker");

// Create broker
let broker = new ServiceBroker({
	nodeID: process.argv[2] || hostname + "-server",
	//logger: console
});

broker.loadService(__dirname + "/../math.service");

broker.start();

console.log("Server started. nodeID: ", broker.nodeID, ", PID:", process.pid);

function next(res) {
	//console.info(`${payload.a} + ${payload.b} = ${res}`);
	process.nextTick(work);
}

let payload = { a: _.random(0, 100), b: _.random(0, 100) };
function work() {
	broker.call("math.add", payload).then(next);		
}

setTimeout(() => { 
	console.log("Client started. nodeID:", broker.nodeID, " PID:", process.pid);

	let startTime = Date.now();
	work();

	setInterval(() => {
		if (broker._callCount > 0) {
			let rps = broker._callCount / ((Date.now() - startTime) / 1000);
			console.log(broker.nodeID, ":", rps.toFixed(0), "req/s");
			broker._callCount = 0;
			startTime = Date.now();
		}
	}, 1000);

}, 1000);