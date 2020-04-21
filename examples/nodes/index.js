/* eslint-disable no-console */

"use strict";

const _ = require("lodash");
const cluster = require("cluster");
const stopSignals = [
	"SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
	"SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"
];

let stopping = false;

const NODE_PREFIX = process.env.NODE_PREFIX || "node";

const nodes = [];

function log(...args) {
	console.log("[MASTER]", ...args);
}

function scale(num) {
	if (num > nodes.length) {
		// Start new nodes
		log(`Starting ${num - nodes.length} new nodes...`);
		return _.times(num - nodes.length, () => startNewNode(getNextNodeID()));

	} else if (num < nodes.length && num >= 0) {
		// Stop random nodes
		log(`Stopping ${nodes.length - num} nodes...`);
		return _.times(nodes.length - num, () => {
			const node = nodes[_.random(nodes.length - 1)];
			return stopNode(node);
		});
	}
}

function getNextNodeID() {
	let c = 1;
	let nodeID = `${NODE_PREFIX}-${c}`;
	while (nodes.find(n => n.nodeID == nodeID)) {
		nodeID = `${NODE_PREFIX}-${++c}`;
	}

	return nodeID;
}

function startNewNode(nodeID) {
	const worker = cluster.fork();
	worker.on("message", msg => messageHandler(worker, msg));
	worker.on("disconnect", () => {
		const idx = nodes.findIndex(node => node.worker == worker);
		if (idx != -1)
			nodes.splice(idx, 1);
		log(`Node ${worker.nodeID} stopped.`);
	});

	worker.send({ cmd: "start", nodeID });

	nodes.push({ nodeID, worker });
}

function stopNode(node) {
	node.worker.send({ cmd: "stop" });
}

function messageHandler(worker, msg) {
	log(msg);
	if (msg.event == "started") {
		//
	} else if (msg.event == "scale") {
		scale(msg.count);
	}
}

async function start() {
	if (cluster.isMaster) {
		cluster.setupMaster({
			serialization: "json",
		});

		const nodeCount = process.env.NODE_COUNT || 10;
		scale(nodeCount);

		stopSignals.forEach(signal => {
			process.on(signal, () => {
				log(`Got ${signal}, stopping workers...`);
				stopping = true;
				cluster.disconnect(() => {
					log("All workers stopped, exiting.");
					process.exit(0);
				});
			});
		});
	} else {
		/*const worker = cluster.worker;
		//console.log(worker);
		const nodeID = NODE_PREFIX + "-" + worker.id;
		worker.nodeID = nodeID;
		worker.process.argv.push(nodeID);*/

		require("./node.js");
	}

}

module.exports = start();

