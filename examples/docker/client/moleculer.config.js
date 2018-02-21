"use strict";

const hostname = require("os").hostname();
const fs = require("fs");
const _ = require("lodash");

let filename;

module.exports = {
	namespace: "docker",
	nodeID: `client-${hostname}-${process.pid}`,
	logger: true,
	logLevel: "info",
	transporter: {
		type: "TCP",
		options: {
			//debug: true
		}
	},

	started(broker) {
		filename = "./" + broker.nodeID + "-nodes.json";
		let reqCount = 0;
		broker.waitForServices("worker").then(() => {
			setInterval(() => {
				let payload = {
					n: 1 + Math.floor(Math.random() * 49),
					c: ++reqCount
				};
				let p = broker.call("worker.fibo", payload);
				if (p.ctx)
					broker.logger.info(`${reqCount}. Send request 'fibo(${payload.n})' to ${p.ctx.nodeID ? p.ctx.nodeID : "some node"} (queue: ${broker.transit.pendingRequests.size})...`);

				p.then(res => {
					broker.logger.info(`${payload.c}. fibo(${payload.n}) = ${res} (from: ${p.ctx.nodeID})`);
				}).catch(err => {
					broker.logger.warn(`${reqCount}. Request 'fibo(${payload.n})' ERROR! ${err.message}`);
				});

				const list = broker.registry.nodes.toArray().map(node => _.pick(node, ["id", "seq", "offlineSince", "available", "hostname", "port", "ipList", "udpAddress"]));
				fs.writeFileSync(filename, JSON.stringify(list, null, 2));
			}, 1000);
		});
	},

	stopped(broker) {
		fs.unlink(filename);
	}
};
