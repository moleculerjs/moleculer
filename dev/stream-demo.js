"use strict";

const ServiceBroker = require("../src/service-broker");
const { Transform } = require("stream");

/*
	It works with text:
		echo "hello" | node dev/stream-demo.js

	or with files:
		Linux: 		echo test.txt | node dev/stream-demo.js
		Windows:	type test.txt | node dev\stream-demo.js

*/

// Create broker #1
const broker1 = new ServiceBroker({
	nodeID: "client-" + process.pid,
	transporter: "TCP",
	logger: console,
	logLevel: "debug"
});

// Create broker #2
const broker2 = new ServiceBroker({
	nodeID: "converter-" + process.pid,
	transporter: "TCP",
	logger: console,
	logLevel: "debug"
});

broker2.createService({
	name: "text-converter",
	actions: {
		upper(ctx) {
			return ctx.stream.pipe(
				new Transform({
					transform: function (chunk, encoding, done) {
						this.push(chunk.toString().toUpperCase());
						return done();
					}
				})
			);
		}
	}
});

broker1.Promise.all([broker1.start(), broker2.start()])
	.then(() => broker1.waitForServices("text-converter"))
	.then(() => {
		broker1.call("text-converter.upper", null, { stream: process.stdin }).then(stream => {
			console.log(
				"\nWrite something to the console and press ENTER. The data is transferred via streams:"
			);
			stream.pipe(process.stdout);

			stream.on("end", () => {
				broker1.logger.warn("Stream is ended. Stopping brokers...");

				broker2.stop();
				broker1.stop();
			});
		});
	});
