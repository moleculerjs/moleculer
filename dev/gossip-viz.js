"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const ServiceBroker = require("../src/service-broker");
const { randomInt } = require("../src/utils");

const COUNT = process.argv[2] ? Number(process.argv[2]) : 20;
const nodePrefix = process.argv[3] || "node";
const namespace = "viz-" + randomInt(100);

console.log(`Create ${COUNT} nodes...`);

const brokers = [];
for (let i = 0; i < COUNT; i++) {
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
				maxConnections: 10 // Max live TCP socket
				//udpBroadcast: true,
				//udpBroadcast: "192.168.2.255",
				//udpMulticast: null,
				//udpBindAddress: "192.168.2.100"
			}
		},
		//logger: console,
		logLevel: "warn"
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

	setInterval(() => {
		const idx = randomInt(brokers.length - 1);
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

	for (let i = 0; i < brokers.length; i++) {
		const count = printBrokerStatus(brokers[i]);
		sum += count;
	}

	let coverage = Math.floor((sum / liveNodes / liveNodes) * 100);
	if (coverage > 100) coverage = 100 - (coverage - 100); // if node disappeared it will be > 100

	const duration = Math.floor((Date.now() - startTime) / 1000);

	const sCov = coverage == 100 ? kleur.green().bold(coverage + "%") : kleur.bold(coverage + "%");
	console.log("Time: " + _.padStart(duration, 5), "sec    Coverage:", _.padStart(sCov, 13));
}

function getMaxSeq(nodeID) {
	return brokers.reduce((seq, { broker }) => {
		if (!broker) return seq;
		let n = broker.registry.nodes.toArray().find(n => n.id == nodeID);
		return n && n.seq && n.seq > seq ? n.seq : seq;
	}, 0);
}

function printBrokerStatus({ nodeID, broker }) {
	let count = 0;
	let s = _.padEnd(broker ? kleur.green(nodeID) : kleur.red(nodeID), 20);

	if (broker) {
		const list = broker.registry.nodes.toArray();

		s += "│";
		for (let i = 0; i < brokers.length; i++) {
			const search = brokers[i].nodeID;

			const node = list.find(node => node.id == search);
			if (node) {
				if (node.available) {
					s += kleur.green().bold("█");
					count++;
				} else if (node.seq == 0) s += kleur.yellow("█");
				else s += kleur.red().bold("█");
			} else {
				s += kleur.red().bold("█");
			}
		}
		s += "│";

		if (broker.transit.tx.constructor.name == "TcpTransporter")
			s += ` ${_.padStart(broker.transit.tx.reader.sockets.length, 3)} <-|-> ${_.padStart(
				broker.transit.tx.writer.sockets.size,
				3
			)}`;
	} else {
		s += "│" + _.padStart("", brokers.length) + "│";
	}

	console.log(s);

	return count;
}
