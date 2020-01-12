"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");
const kleur = require("kleur");
const crypto = require("crypto");

const password = "moleculer";

// Create broker #1
const broker = new ServiceBroker({
	nodeID: "caller-" + process.pid,
	transporter: "NATS",
	serializer: "JSON",
	logger: console,
	logLevel: "debug"
});

let origHash;

broker.start()
	.delay(2000)
	.then(() => {
		//broker.repl();

		const fileName = "d://1.pdf";
		const fileName2 = "d://2.pdf";

		return getSHA(fileName).then(hash1 => {
			origHash = hash1;
			broker.logger.info("Original SHA:", hash1);

			const startTime = Date.now();

			const stream = fs.createReadStream(fileName);

			broker.call("aes.encrypt", stream)
				.then(stream => broker.call("aes.decrypt", stream))
				.then(stream => {
					const s = fs.createWriteStream(fileName2);
					stream.pipe(s);
					s.on("close", () => {
						broker.logger.info("Time:", Date.now() - startTime + "ms");
						getSHA(fileName2).then(hash => {
							broker.logger.info("Received SHA:", hash);

							if (hash != origHash) {
								broker.logger.error(kleur.red().bold("Hash mismatch!"));
							} else {
								broker.logger.info(kleur.green().bold("Hash OK!"));
							}
						});

						broker.stop();
					});
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
