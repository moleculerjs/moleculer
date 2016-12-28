"use strict";

let _ = require("lodash");
let chalk = require("chalk");
let uuid = require("uuid");

let Benchmarker = require("../benchmarker");

console.log(chalk.yellow.bold("========================="));
console.log(chalk.yellow.bold("|  Transport benchmark  |"));
console.log(chalk.yellow.bold("========================="));
console.log("");

let dataFiles = ["150", "1k", "10k", "50k", "100k", "1M"];

function runTest(dataName) {

	let Nats = require("nats");
	let nats = Nats.connect();

	let Redis = require("ioredis");
	let redisSub = new Redis();
	let redisPub = new Redis();


	let bench = new Benchmarker({ async: true, name: `Transport with ${dataName}bytes`});
	let data = bench.getDataFile(dataName + ".json");

	let subject = uuid.v4();

	bench.add("NATS", function() {
		return new Promise((resolve, reject) => {
			let sid = nats.subscribe(subject, (msg) => {
				if (msg.length != data.length) {
					throw new Error("Invalid message!");
				}
				nats.unsubscribe(sid);
				resolve();
			});

			nats.publish(subject, data);		
		});
	});

	let __resolve;

	redisSub.on("message", (channel, msg) => {
		if (channel != subject) 
			throw new Error("Invalid channel! " + channel);

		if (msg.length != data.length)
			throw new Error("Invalid message! " + msg);

		redisSub.unsubscribe(subject);
		__resolve();
	});

	bench.add("Redis", function() {
		return new Promise((resolve, reject) => {
			redisSub.subscribe(subject).then(() => {
				redisPub.publish(subject, data);
			});
			__resolve = resolve;
		});
	});

	// TODO: MQTT, AMQP, Websocket

	nats.on("connect", () => {
		bench.run().then(() => {
			nats.close();
			redisPub.disconnect();
			redisSub.disconnect();

			if (dataFiles.length > 0)
				runTest(dataFiles.shift());
		});
	});

}

runTest(dataFiles.shift());