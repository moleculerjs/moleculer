"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Create broker
const broker = new ServiceBroker({
	nodeID: "streaming-receiver",
	transporter: "NATS",
	logger: console,
	logLevel: "info"
});

broker.start().then(() => {
	broker.repl();

}).delay(1000).then(() => {
	const fileName = "d://src.zip";
	const stat = fs.statSync(fileName);
	let uploadedSize = 0;

	broker.call("file.get")
		.then(stream => {
			const fileName = "d://received-src.zip";
			broker.logger.info("Open file");
			const s = fs.createWriteStream(fileName);
			stream.pipe(s);

			stream.on("data", chunk => {
				uploadedSize += chunk.length;
				broker.logger.info("RECV: ", Number(uploadedSize / stat.size * 100).toFixed(0) + "%");
			});

			s.on("close", () => {
				getSHA(fileName).then(hash => {
					broker.logger.info("File received! SHA:", hash);
				});
			});

			s.on("error", err => {
				broker.logger.info("Stream error!", err);
			});
		});
});

function getSHA(fileName) {
	return new Promise((resolve, reject) => {
		let hash = crypto.createHash("sha1");
		let stream = fs.createReadStream(fileName);
		stream.on("error", err => reject(err));
		stream.on("data", chunk => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}
