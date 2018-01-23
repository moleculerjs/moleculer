/* eslint-disable no-console */

"use strict";

//let _ = require("lodash");
let chalk = require("chalk");
let ServiceBroker = require("../../src/service-broker");
let Promise = require("bluebird");

let { getDataFile } = require("../utils");

let Benchmarkify = require("benchmarkify");
let benchmark = new Benchmarkify("Throughput benchmark").printHeader();

let dataFiles = ["10"];//, "150", "1k", "10k", "50k", "100k", "1M"];

const MAX = 20 * 1000;
let received = 0;
let resolve = null;
let startTime;
let endTime;

function done() {
	endTime = Date.now();

	let mps = parseInt(MAX / ((endTime - startTime) / 1000));
	console.log("Messages  : " + received.toLocaleString("en-US", {maximumFractionDigits: 0}) + " msgs");
	console.log("Throughput: " + chalk.green.bold(mps.toLocaleString("en-US", {maximumFractionDigits: 0})) + " msgs/sec");
	console.log("");

	resolve();
}

function createBrokers(transporter) {
	let b1 = new ServiceBroker({
		transporter,
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		transporter,
		//requestTimeout: 0,
		//logger: console,
		//logLevel: "debug",
		nodeID: "node-2"
	});

	b2.createService({
		name: "echo",
		actions: {
			reply(ctx) {
				received++;
				if (received >= MAX)
					done();
			}
		}
	});

	return Promise.all([
		b1.start(),
		b2.start()
	]).delay(1000).then(() => [b1, b2]);
}

function measureTP(transporter, dataName) {
	received = 0;


	console.log(chalk.cyan.bold(`'${transporter}' transporter with ${dataName}bytes payload:`));
	console.log(chalk.cyan.bold("==============================================="));

	let data = getDataFile(dataName + ".json");
	let payload = JSON.parse(data);

	return createBrokers(transporter)
		.then(([b1, b2]) => {
			return new Promise(r => {
				resolve = r;
				startTime = Date.now();

				for (let i = 0; i < MAX; i++)
					b1.call("echo.reply", payload).catch(err => console.error(err.message));

			}).then(() => Promise.all([b1.stop(), b2.stop()]));
		});
}

function runTest(dataName) {
	return Promise.resolve()
		.then(() => Promise.map([
			"Fake",
			"NATS",
			"Redis",
			"MQTT"
		], transporter => measureTP(transporter, dataName), { concurrency: 1}))
		.then(() => {
			if (dataFiles.length > 0)
				runTest(dataFiles.shift());
		});
}

runTest(dataFiles.shift());

/*

*/
