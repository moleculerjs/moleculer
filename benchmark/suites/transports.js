"use strict";

let _ = require("lodash");
let { generateToken } = require("../../src/utils");
let Promise	= require("bluebird");
let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Transport benchmark");

let dataFiles = ["150"];//, "1k", "10k", "50k", "100k", "1M"];

function runTest(dataName) {

	let Nats = require("nats");
	let nats = Nats.connect();
	let nats2 = Nats.connect();

	let Redis = require("ioredis");
	let redisSub = new Redis();
	let redisPub = new Redis();


	let bench = new Benchmarkify({ async: true, name: `Transport with ${dataName}bytes`});
	let data = getDataFile(dataName + ".json");

	let subject = generateToken();
	let subject2 = generateToken();

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

	bench.skip("NATS (send 10k msgs)", function() {

		return new Promise((resolve, reject) => {
			let MAX = 1 * 1000;
			let c = 0;
			let sid = nats.subscribe(subject2, (msg) => {
				if (msg.length != data.length) {
					reject(new Error("Invalid message!"));
				}
				c++;

				if (c == MAX) {
					nats.unsubscribe(sid);
					resolve();
				}
				//console.log("<-", c);
			});

			nats.flush(() => {
				for(let i = 0; i < MAX; i++) {
					nats.publish(subject2, data);
					//console.log("->", i);
				}
			});
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
			nats2.close();
			redisPub.disconnect();
			redisSub.disconnect();

			if (dataFiles.length > 0)
				runTest(dataFiles.shift());
		});
	});

}

runTest(dataFiles.shift());