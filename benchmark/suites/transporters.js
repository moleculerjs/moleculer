"use strict";

//let _ = require("lodash");
let ServiceBroker = require("../../src/service-broker");
let Promise = require("bluebird");

let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Transporters benchmark").printHeader();

let dataFiles = ["10"];//, "150", "1k", "10k", "50k", "100k", "1M"];

function createBrokers(transporter) {
	let b1 = new ServiceBroker({
		transporter,
		//requestTimeout: 0,
		logger: false,
		//logLevel: "debug",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		transporter,
		//requestTimeout: 0,
		logger: false,
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

	return Promise.all([
		b1.start(),
		b2.start()
	]).then(() => [b1, b2]);
}

function runTest(dataName) {

	let bench = benchmark.createSuite(`Transport with ${dataName}bytes`);
	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	Promise.all([
		createBrokers("Fake"),
		createBrokers("NATS"),
		createBrokers("Redis"),
		createBrokers("MQTT"),
		//createBrokers("amqp://192.168.51.29:5672")
		createBrokers("TCP"),
	]).delay(1000).then(([
		[fake1, fake2],
		[nats1, nats2],
		[redis1, redis2],
		[mqtt1, mqtt2],
		[tcp1, tcp2],
		//[amqp1, amqp2],
	]) => {
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

		/*bench.add("AMQP", done => {
			return amqp1.call("echo.reply", payload).then(done);
		});*/

		bench.add("TCP", done => {
			return tcp1.call("echo.reply", payload).then(done);
		});

		bench.run().then(() => {
			return Promise.all([
				fake1.stop(),
				fake2.stop(),

				nats1.stop(),
				nats2.stop(),

				redis1.stop(),
				redis2.stop(),

				mqtt1.stop(),
				mqtt2.stop(),

				// amqp1.stop(),
				// amqp2.stop()

				tcp1.stop(),
				tcp2.stop(),
			]).then(() => {
				if (dataFiles.length > 0)
					runTest(dataFiles.shift());
			});
		});
	});
}

runTest(dataFiles.shift());

/*
==========================
  Transporters benchmark
==========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.9.4
   V8: 6.1.534.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

Suite: Transport with 10bytes
√ Fake*            55,626 rps
√ NATS*             8,729 rps
√ Redis*            8,590 rps
√ MQTT*             8,103 rps
√ TCP*             11,249 rps

   Fake* (#)        0%         (55,626 rps)   (avg: 17μs)
   NATS*       -84.31%          (8,729 rps)   (avg: 114μs)
   Redis*      -84.56%          (8,590 rps)   (avg: 116μs)
   MQTT*       -85.43%          (8,103 rps)   (avg: 123μs)
   TCP*        -79.78%         (11,249 rps)   (avg: 88μs)
-----------------------------------------------------------------------

*/
