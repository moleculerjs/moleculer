/* eslint-disable no-console */
"use strict";

const Message		= require("./message");
const TcpServer		= require("./tcp-server");

const opts = {
	tcpPort: 3210, // random port
	timeout: 10 * 1000,
};

let count = 0;
let counter = 1;
let socket;

function connect() {
	console.log("Connecting...");
	TcpServer.connect("127.0.0.1", opts.tcpPort)
		.then(_socket => {
			socket = _socket;
			//socket.setNoDelay();

			socket.on("error", err => {
				console.warn("TCP client error!", err);
				process.exit(1);
			});

			socket.on("close", hadError => {
				console.info("TCP client is disconnected! Had error:", hadError);
				setTimeout(() => connect(), 1000);
			});

			setImmediate(() => doSend());

		})
		.catch(err => {
			console.log(`Can't connect to 127.0.0.1:${opts.tcpPort}`, err);
			setTimeout(() => connect(), 1000);
		});

}

//let buf = Buffer.from("OK");

function doSend() {
	//if (counter > 1 * 1000 * 1000)
	//	return;

	const msg = new Message();
	msg.addFrame(1, Buffer.from("" + counter));
	//console.log(`Send ${counter}`);
	count++;
	counter++;

	socket.write(msg.toBuffer());
	//socket.write(buf);

	if (count % 1000) {
		// Fast cycle
		doSend();
	} else {
		// Slow cycle
		setImmediate(doSend);
	}
	/*
	if (count < 100)
		doSend();
	else
		process.exit(0);*/
}

setTimeout(() => {
	let startTime = Date.now();

	setInterval(() => {
		let rps = count / ((Date.now() - startTime) / 1000);
		console.log("RPS:", rps.toLocaleString("en-GB", {maximumFractionDigits: 0}), "req/s");
		count = 0;
		startTime = Date.now();
	}, 1000);

}, 1000);

setTimeout(connect, 2000);
