"use strict";

const kleur = require("kleur");
const ServiceBroker = require("../../src/service-broker");
const { polyfillPromise } = require("../../").Utils;
polyfillPromise(Promise);

const { getDataFile } = require("../utils");

const Benchmarkify = require("benchmarkify");
new Benchmarkify("Throughput benchmark").printHeader();

const dataFiles = ["10"]; //, "150", "1k", "10k", "50k", "100k", "1M"];

const MAX = 10 * 1000;
let received = 0;
let resolve = null;
let startTime;
let endTime;

function done() {
	endTime = Date.now();

	let mps = parseInt(MAX / ((endTime - startTime) / 1000));
	console.log(
		"Messages  : " + received.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " msgs"
	);
	console.log(
		"Throughput: " +
			kleur.green().bold(mps.toLocaleString("en-US", { maximumFractionDigits: 0 })) +
			" msgs/sec"
	);
	console.log("");

	resolve();
}

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
			reply() {
				received++;
				if (received >= MAX) done();
			}
		},
		events: {
			"echo.event"() {
				received++;
				if (received >= MAX) done();
			}
		}
	});

	return Promise.all([b1.start().then(() => b1.waitForServices("echo")), b2.start()])
		.delay(1000)
		.then(() => [b1, b2]);
}

function measureTP(transporter, dataName) {
	received = 0;

	console.log(kleur.cyan().bold(`'${transporter}' transporter with ${dataName}bytes payload:`));
	console.log(kleur.cyan().bold("==============================================="));

	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	return createBrokers(transporter).then(([b1, b2]) => {
		//b1.repl();
		return new Promise(r => {
			resolve = r;
			startTime = Date.now();

			for (let i = 0; i < MAX; i++) {
				b2.emit("echo.event", payload);
				/*b1.call("echo.reply", payload).catch(err =>
					console.error(transporter, err.message)
				);*/
			}
		})
			.delay(500)
			.then(() => Promise.all([b1.stop(), b2.stop()]));
	});
}

function runTest(dataName) {
	return Promise.resolve()
		.then(() =>
			Promise.mapSeries(["Redis", "AMQP"], transporter => measureTP(transporter, dataName))
		)
		.then(() => {
			if (dataFiles.length > 0) runTest(dataFiles.shift());
		});
}

runTest(dataFiles.shift());

/*
========================
  Throughput benchmark
========================

Platform info:
==============
   Windows_NT 6.1.7601 x64
   Node.JS: 8.11.0
   V8: 6.2.414.50
   Intel(R) Core(TM) i7-4770K CPU @ 3.50GHz × 8

'Fake' transporter with 10bytes payload:
===============================================
Messages  : 20,000 msgs
Throughput: 38,986 msgs/sec

'TCP' transporter with 10bytes payload:
===============================================
Messages  : 20,000 msgs
Throughput: 26,420 msgs/sec

'MQTT' transporter with 10bytes payload:
===============================================
(node:7768) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 1001 drain listeners added. Use emitter.setMaxListeners() to increase limit
Messages  : 20,000 msgs
Throughput: 5,767 msgs/sec

'Redis' transporter with 10bytes payload:
===============================================
Messages  : 20,000 msgs
Throughput: 12,562 msgs/sec

'NATS' transporter with 10bytes payload:
===============================================
Messages  : 20,000 msgs
Throughput: 22,805 msgs/sec

*/
