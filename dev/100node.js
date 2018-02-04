/* eslint-disable no-console */

"use strict";

const _ = require("lodash");
const chalk = require("chalk");
const ServiceBroker = require("../src/service-broker");
const Promise = require("bluebird");

const COUNT = process.argv[2] ? Number(process.argv[2]) : 25;
const nodeID = process.argv[3] || "node";

console.log(`Create ${COUNT} nodes...`);

const brokers = [];
for(let i = 0; i < COUNT; i++) {
	const broker = createBroker(i);
	brokers.push(broker);
}

function createBroker(i) {
	const broker = new ServiceBroker({
		nodeID: nodeID + "-" + (i + 1),
		transporter: "TCP",
		//logger: console,
		logFormatter: "simple",
	});

	return broker;
}

console.log("Start nodes...");

Promise.all(brokers.map(broker => broker.start())).then(() => {
	console.log("All nodes started.");

	setInterval(() => {
		printStatuses();
	}, 1000);

	setInterval(() => {
		const idx = _.random(brokers.length);
		const broker = brokers[idx];

		if (broker) {
			// Stop node
			console.log(`Stop '${broker.nodeID}'...`);
			broker.stop();
			brokers[idx] = null;
		} else {
			// Start node
			console.log(`Start 'node-${idx + 1}'...`);
			const broker = createBroker(idx);
			broker.start(() => {
				brokers[idx] = broker;
			});
		}


	}, 10000);

	brokers[0].repl();
});

function printStatuses() {
	for(let i = 0; i < brokers.length; i++) {
		printBrokerStatus(brokers[i], i);
	}
	console.log();
	console.log();
}

function printBrokerStatus(broker, i) {
	let s = _.padEnd(broker ? chalk.green(broker.nodeID) : chalk.red(`node-${i + 1}`), 10);

	if (broker) {
		const list = broker.registry.nodes.list();
		list.sort((a, b) => a && b && a.id.localeCompare(b.id));

		s += "[";
		for(let i = 0; i < list.length; i++) {
			s += list[i].available ? chalk.green.bold("■") : chalk.red.bold("■");
		}
		s += "]";
	}

	console.log(s);
}
