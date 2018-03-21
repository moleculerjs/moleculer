"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");

// Create broker
const broker = new ServiceBroker({
	nodeID: "streaming-receiver",
	transporter: {
		type: "NATS",
		options: {
			//debug: true
		}
	},
	logger: console,
	logLevel: "debug"
});

broker.start().then(() => {
	broker.repl();

}).delay(2000).then(() => {
	broker.call("file.get")
		.then(stream => {
			broker.logger.info("Open file");
			const s = fs.createWriteStream("d://received-www.zip");
			stream.pipe(s);

			s.on("close", () => {
				broker.logger.info("File received!");
			});

			s.on("error", err => {
				broker.logger.info("Stream error!", err);
			});
		});
});
