/* eslint-disable no-console */
"use strict";

const Message		= require("./message");
const TcpServer		= require("./tcp-server");

const opts = {
	tcpPort: 3210,
	timeout: 10 * 1000,
};

let count = 0;

const tx = {
	logger: console,
	nodeID: "test",
	broker: {
		namespace: ""
	}
};

this.tcpServer = new TcpServer(tx, opts);
this.tcpServer.on("connect", socket => {
	//socket.setNoDelay();
	let counter = 0;

	let parser = Message.getParser();
	socket.pipe(parser);

	parser.on("data", message => {
		counter++;
		count++;
		try {
			const data = message.getFrameData(1);
			const c = parseInt(data.toString(), 10);
			if (c !== counter)
				throw new Error(`Missing packet! Expected: ${counter}, Received: ${c}`);
		} catch(err) {
			console.log(err);
			console.log(message.toString());
			process.exit(1);
		}
	});

	parser.on("error", err => {
		console.warn("Packet parser error!", err);
		process.exit(1);
	});

	socket.on("error", err => {
		console.warn("TCP client error!", err);
		//process.exit(1);
	});

	socket.on("close", hadError => {
		console.info("TCP client is disconnected! Had error:", hadError);
		//process.exit(1);
	});
});

this.tcpServer.listen();

setTimeout(() => {
	let startTime = Date.now();

	setInterval(() => {
		let rps = count / ((Date.now() - startTime) / 1000);
		console.log("RPS:", rps.toLocaleString("en-GB", {maximumFractionDigits: 0}), "req/s"/*, "Total:", counter.toLocaleString("en-GB", {maximumFractionDigits: 0})*/);
		count = 0;
		startTime = Date.now();
	}, 1000);

}, 1000);
