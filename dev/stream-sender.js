"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Create broker
const broker = new ServiceBroker({
	nodeID: "streaming-sender",
	transporter: "TCP",
	logger: console,
	logLevel: "info"
});

broker.createService({
	name: "file",
	actions: {
		get(ctx) {
			const fileName = "d://src.zip";
			const stat = fs.statSync(fileName);
			let uploadedSize = 0;

			const stream = fs.createReadStream(fileName);

			stream.on("data", chunk => {
				uploadedSize += chunk.length;
				this.logger.info("SEND: ", Number(uploadedSize / stat.size * 100).toFixed(0) + "%");
			});

			stream.on("close", () => {
				getSHA(fileName).then(hash => {
					broker.logger.info("File sent.");
					broker.logger.info("SHA:", hash);
					broker.logger.info("Size:", stat.size);
				});
			});

			return stream;
		}
	}
});

broker.start().then(() => {
	broker.repl();
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
