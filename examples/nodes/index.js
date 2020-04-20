/* eslint-disable no-console */

"use strict";

const _ = require("lodash");
const cluster = require("cluster");
const stopSignals = [
	"SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
	"SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"
];

let stopping = false;

async function start() {
	if (cluster.isMaster) {
		const nodeCount = process.env.NODE_COUNT || 10;
		console.log(`Starting ${nodeCount} nodes...`);
		for (let i = 0; i < nodeCount; i++) {
			const worker = cluster.fork();
			//console.log(worker);
		}

		stopSignals.forEach(signal => {
			process.on(signal, () => {
				console.log(`Got ${signal}, stopping workers...`);
				stopping = true;
				cluster.disconnect(() => {
					console.log("All workers stopped, exiting.");
					process.exit(0);
				});
			});
		});
	} else {
		const worker = cluster.worker;
		//console.log(worker);
		let prefix = process.env.NODE_PREFIX || "node";
		worker.process.argv.push(prefix + "-" + worker.id);

		const start = require("./node.js");
		return start();
	}

}

module.exports = start();

