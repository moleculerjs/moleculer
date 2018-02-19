/* eslint-disable no-console */

"use strict";

const _ = require("lodash");
const chalk = require("chalk");
const ServiceBroker = require("../src/service-broker");
const Promise = require("bluebird");

const COUNT = process.argv[2] ? Number(process.argv[2]) : 20;
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
		//transporter: "NATS",
		transporter: {
			type: "TCP",
			options: {
				gossipPeriod: 2, // seconds
				maxConnections: 10, // Max live TCP socket
				udpBroadcast: "192.168.2.255",
				udpMulticast: null,
			}
		},
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
	if (coverage > 100) coverage = 100 - (coverage - 100); // if node disappeared it will be > 100

	const duration = Math.floor((Date.now() - startTime) / 1000);

	const sCov = coverage == 100 ? chalk.green.bold(coverage + "%") : chalk.bold(coverage + "%");
	console.log("Time: " + _.padStart(duration, 5), "sec    Coverage:", _.padStart(sCov, 13));
}

function getMaxSeq(nodeID) {
	return brokers.reduce((seq, { broker }) => {
		if (!broker) return seq;
		let n = broker.registry.nodes.toArray().find(n => n.id == nodeID);
		return (n && n.seq && n.seq > seq) ? n.seq : seq;
	}, 0);
}

function printBrokerStatus({ nodeID, broker }) {
	let count = 0;
	let s = _.padEnd(broker ? chalk.green(nodeID) : chalk.red(nodeID), 20);

	if (broker) {
		const list = broker.registry.nodes.toArray();

		s += "│";
		for(let i = 0; i < brokers.length; i++) {
			const search = brokers[i].nodeID;

			const node = list.find(node => node.id == search);
			if (node && node.available) {
				//if (node.seq == getMaxSeq(node.id))
					s += chalk.green.bold("█");
				//else
				//	s += chalk.yellow.bold("█");
				count++;
			} else {
				s += chalk.red.bold("█");
			}
		}
		s += "│";

		if (broker.transit.tx.constructor.name == "TcpTransporter")
			s += ` ${_.padStart(broker.transit.tx.reader.sockets.length, 3)} <-|-> ${_.padStart(broker.transit.tx.writer.sockets.size, 3)}`;
	} else {
		s += "│" + _.padStart("", brokers.length) + "│";
	}

	console.log(s);

	return count;
}
