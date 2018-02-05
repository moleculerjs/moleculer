/* eslint-disable no-console */

"use strict";

const _ = require("lodash");
const chalk = require("chalk");
const ServiceBroker = require("../src/service-broker");
const Promise = require("bluebird");

const COUNT = process.argv[2] ? Number(process.argv[2]) : 10;
const nodePrefix = process.argv[3] || "node";
const namespace = "viz-" + Math.round(_.random(100));

console.log(`Create ${COUNT} nodes...`);

const brokers = [];
for(let i = 0; i < COUNT; i++) {
	const nodeID = nodePrefix + "-" + (i + 1);
	const broker = createBroker(nodeID);
	brokers.push({ nodeID, broker });
}

function createBroker(nodeID) {
	const broker = new ServiceBroker({
		namespace,
		nodeID,
		transporter: "TCP",
		//logger: console,
		logLevel: "warn",
		//logFormatter: "simple",
	});

	return broker;
}

console.log("Start nodes...");
let startTime = Date.now();

Promise.all(brokers.map(({ broker }) => broker.start())).then(() => {
	console.log("All nodes started.");

	console.log("\x1b[2J");

	startTime = Date.now();

	printStatuses();
	setInterval(() => {
		printStatuses();
	}, 1000);

	const timer = setInterval(() => {
		const idx = _.random(brokers.length - 1);
		const { nodeID, broker } = brokers[idx];

		if (broker) {
			// Stop node
			//console.log(`Stop '${nodeID}'...`);
			broker.stop().then(() => {
				brokers[idx].broker = null;
			});
		} else {
			// Start node
			//console.log(`Start '${nodeID}'...`);
			const broker = createBroker(nodeID);
			broker.start().then(() => {
				brokers[idx].broker = broker;
			});
		}


	}, 30000);

	brokers[0].broker.repl();
});

function printStatuses() {
	console.log("\x1b[0;0H");

	const liveNodes = brokers.filter(({ broker }) => !!broker).length;
	let sum = 0;

	for(let i = 0; i < brokers.length; i++) {
		const count = printBrokerStatus(brokers[i]);
		sum += count;
	}

	let coverage = Math.floor((sum / liveNodes) / liveNodes * 100);
	if (coverage > 100) coverage = 100 - (coverage - 100); // if node disappeared

	const duration = Math.floor((Date.now() - startTime) / 1000);

	const sCov = coverage == 100 ? chalk.green.bold(coverage + "%") : chalk.bold(coverage + "%");
	console.log("Time: " + _.padStart(duration, 5), "sec    Coverage:", _.padStart(sCov, 13));
}

function printBrokerStatus({ nodeID, broker }) {
	let count = 0;
	let s = _.padEnd(broker ? chalk.green(nodeID) : chalk.red(nodeID), 20);

	if (broker) {
		const list = broker.registry.nodes.list();

		s += "│";
		for(let i = 0; i < brokers.length; i++) {
			const search = brokers[i].nodeID;

			const node = list.find(node => node.id == search);
			if (node && node.available) {
				s += chalk.green.bold("█");
				count++;
			} else {
				s += chalk.red.bold("█");
			}
		}
		s += "│";
	} else {
		s += "│" + _.padStart("", brokers.length) + "│";
	}

	console.log(s);

	return count;
}
