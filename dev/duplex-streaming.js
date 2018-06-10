"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const password = "moleculer";

// Create broker #1
const broker1 = new ServiceBroker({
	namespace: "streaming",
	nodeID: "client-" + process.pid,
	transporter: "NATS",
	serializer: "Thrift",
	logger: console,
	logLevel: "info"
});


// Create broker #2
const broker2 = new ServiceBroker({
	namespace: "streaming",
	nodeID: "encrypter-" + process.pid,
	transporter: "NATS",
	serializer: "Thrift",
	logger: console,
	logLevel: "info"
});

broker2.createService({
	name: "aes",
	actions: {
		encrypt(ctx) {
			const encrypt = crypto.createCipher("aes-256-ctr", password);
			return ctx.params.pipe(encrypt);
		},

		decrypt(ctx) {
			const decrypt = crypto.createDecipher("aes-256-ctr", password);
			return ctx.params.pipe(decrypt);
		}
	}
});

broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(2000)
	.then(() => {
		//broker1.repl();

		const fileName = "d://1.pdf";
		const fileName2 = "d://2.pdf";

		return getSHA(fileName).then(hash1 => {
			broker1.logger.info("Original SHA:", hash1);

			const startTime = Date.now();

			const stream = fs.createReadStream(fileName);

			broker1.call("aes.encrypt", stream)
				.then(stream => broker1.call("aes.decrypt", stream))
				.then(stream => {
					const s = fs.createWriteStream(fileName2);
					stream.pipe(s);
					s.on("close", () => {
						broker1.logger.info("Time:", Date.now() - startTime + "ms");
						getSHA(fileName2).then(hash => broker1.logger.info("Received SHA:", hash));

						broker2.stop();
						broker1.stop();
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
