"use strict";

let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let Context = require("../../src/context");
let Transporters = require("../../src/transporters");

let { generateToken, json2String } = require("../../src/utils");
let Promise	= require("bluebird");
let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
Benchmarkify.printHeader("Transporters benchmark");

let dataFiles = ["8"];//, "150", "1k", "10k", "50k", "100k", "1M"];

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
	// let [nats1, nats2] = createBrokers(Transporters.NATS);
	// let [redis1, redis2] = createBrokers(Transporters.Redis);
	// let [mqtt1, mqtt2] = createBrokers(Transporters.MQTT);

	bench.add("Ref", function() {
		return fake2.call("echo.reply", {a: json2String(payload)});
	});

	bench.add("Fake", function() {
		return fake1.call("echo.reply", payload);
	});

	bench.skip("request", function() {
		return fake1.transit.request({ params: payload });
	});

	/*bench.add("NATS", function() {
		return nats1.call("echo.reply", payload);
	});

	bench.add("Redis", function() {
		return redis1.call("echo.reply", payload);
	});

	bench.add("MQTT", function() {
		return mqtt1.call("echo.reply", payload);
	});*/
	
	setTimeout(() => {
		bench.run().then(() => {
			fake1.stop();
			fake2.stop();

			// nats1.stop();
			// nats2.stop();

			// redis1.stop();
			// redis2.stop();

			// mqtt1.stop();
			// mqtt2.stop();

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
   Node.JS: 6.9.2
   V8: 5.1.281.88
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Transport with 150bytes
√ Fake x 14,239 ops/sec ±0.37% (89 runs sampled)
√ NATS x 4,389 ops/sec ±0.53% (87 runs sampled)
√ Redis x 4,253 ops/sec ±0.44% (88 runs sampled)
√ MQTT x 3,810 ops/sec ±0.48% (86 runs sampled)

   Fake      0.00%     (14,239 ops/sec)
   NATS    -69.18%      (4,389 ops/sec)
   Redis   -70.13%      (4,253 ops/sec)
   MQTT    -73.24%      (3,810 ops/sec)
-----------------------------------------------------------------------

*/