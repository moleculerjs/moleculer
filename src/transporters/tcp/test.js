/* eslint-disable no-console */
"use strict";

const TcpReader = require("./tcp-reader");
const TcpWriter = require("./tcp-writer");

const opts = {
	port: 3210
};

let count = 0;

const tx = {
	logger: console,
	nodeID: "test",
	broker: {
		namespace: ""
	},
	getNodeInfo(nodeID) {
		return {
			host: "localhost",
			port: 3210
		};
	}
};

const tcpReader = new TcpReader(tx, opts);
tcpReader.listen();

const tcpWriter = new TcpWriter(tx, opts);

const data = Buffer.from("Hello TCP Moleculer");

function doSend() {
	tcpWriter.send("node-1", 1, data);
	/*
	if (count % 1000) {
		// Fast cycle
		doSend();
	} else {
		// Slow cycle
		setImmediate(doSend);
	}*/
}

setTimeout(() => {
	let startTime = Date.now();

	setInterval(() => {
		// let rps = count / ((Date.now() - startTime) / 1000);
		// console.log("RPS:", rps.toLocaleString("en-GB", {maximumFractionDigits: 0}), "req/s");
		// count = 0;
		// startTime = Date.now();

		doSend();
	}, 1000);

}, 1000);
