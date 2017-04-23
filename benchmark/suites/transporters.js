"use strict";

//let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let Transporters = require("../../src/transporters");

let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Transporters benchmark").printHeader();

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

	let bench = benchmark.createSuite(`Transport with ${dataName}bytes`);
	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	let [fake1, fake2] = createBrokers(Transporters.Fake);
	let [nats1, nats2] = createBrokers(Transporters.NATS);
	let [redis1, redis2] = createBrokers(Transporters.Redis);
	let [mqtt1, mqtt2] = createBrokers(Transporters.MQTT);

	bench.ref("Fake", done => {
		return fake1.call("echo.reply", payload).then(done);
	});

	bench.add("NATS", done => {
		return nats1.call("echo.reply", payload).then(done);
	});
	
	bench.add("Redis", done => {
		return redis1.call("echo.reply", payload).then(done);
	});

	bench.add("MQTT", done => {
		return mqtt1.call("echo.reply", payload).then(done);
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
√ Fake*            74,742 rps
√ NATS*             8,651 rps
√ Redis*            7,897 rps
√ MQTT*             7,992 rps

   Fake* (#)        0%         (74,742 rps)   (avg: 13μs)
   NATS*       -88.43%          (8,651 rps)   (avg: 115μs)
   Redis*      -89.43%          (7,897 rps)   (avg: 126μs)
   MQTT*       -89.31%          (7,992 rps)   (avg: 125μs)
-----------------------------------------------------------------------

*/