"use strict";

//let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");
let Transporters = require("../../src/transporters");

let { generateToken, json2String } = require("../../src/utils");
let Promise	= require("bluebird");
let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Transporters benchmark");

let dataFiles = ["10"];//, "150", "1k", "10k", "50k", "100k", "1M"];

function createBrokers(Transporter, opts) {
	let b1 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		transporter: new Transporter(opts),
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-2"
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				return ctx.params;
			}
		}
	});

	b1.start().then(() => b2.start());

	return [b1, b2];
}

function runTest(dataName) {

	let bench = new Benchmarkify({ async: true, name: `Transport with ${dataName}bytes`});
	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	let [fake1, fake2] = createBrokers(Transporters.Fake);
	let [nats1, nats2] = createBrokers(Transporters.NATS);
	let [redis1, redis2] = createBrokers(Transporters.Redis);
	let [mqtt1, mqtt2] = createBrokers(Transporters.MQTT);

	bench.skip("Ref", function() {
		return fake2.call("echo.reply", payload);
	});

	bench.skip("stringify", function() {
		return json2String({"nodeID":"node-1","requestID":"0dfecb75-c6bd-45d0-baa5-21168bef0a8e","action":"echo.reply","params":{"id":5}});
	}, false);

	bench.skip("stringify2", function() {
		return new Promise(resolve => {
			return resolve(JSON.stringify({"nodeID":"node-1","requestID":"0dfecb75-c6bd-45d0-baa5-21168bef0a8e","action":"echo.reply","params":{"id":5}}));

		});
	});

	bench.add("Fake", function() {
		return fake1.call("echo.reply", payload);
	});

	bench.add("NATS", function() {
		return nats1.call("echo.reply", payload);
	});
	
	bench.add("Redis", function() {
		return redis1.call("echo.reply", payload);
	});

	bench.add("MQTT", function() {
		return mqtt1.call("echo.reply", payload);
	});
	
	setTimeout(() => {
		bench.run().then(() => {
			fake1.stop();
			fake2.stop();

			nats1.stop();
			nats2.stop();

			redis1.stop();
			redis2.stop();

			mqtt1.stop();
			mqtt2.stop();

			if (dataFiles.length > 0)
				runTest(dataFiles.shift());
		});
	}, 2000);
	
}

runTest(dataFiles.shift());

/*
==========================
  Transporters benchmark
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 6.10.0
   V8: 5.1.281.93
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Transport with 10bytes
√ Fake x 17,563 ops/sec ±1.39% (82 runs sampled)
√ NATS x 4,655 ops/sec ±1.18% (87 runs sampled)
√ Redis x 4,865 ops/sec ±1.34% (83 runs sampled)
√ MQTT x 4,427 ops/sec ±1.16% (84 runs sampled)

   Fake      0.00%     (17,563 ops/sec)
   NATS    -73.49%      (4,655 ops/sec)
   Redis   -72.30%      (4,865 ops/sec)
   MQTT    -74.79%      (4,427 ops/sec)
-----------------------------------------------------------------------

*/