"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const Promise = require("bluebird");
const path = require("path");
const chalk = require("chalk");
const crypto = require("crypto");

const transporter = "TCP";
const serializer = "ProtoBuf";

// Create broker #1
const broker1 = new ServiceBroker({
	namespace: "streaming",
	nodeID: "client-" + process.pid,
	transporter,
	serializer
});


// Create broker #2
const broker2 = new ServiceBroker({
	namespace: "streaming",
	nodeID: "encrypter-" + process.pid,
	transporter,
	serializer
});

const pass = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

broker2.createService({
	name: "aes",
	actions: {
		encrypt(ctx) {
			const encrypt = crypto.createCipheriv("aes-256-ctr", pass, iv);
			return ctx.params.pipe(encrypt);
		},

		decrypt(ctx) {
			const decrypt = crypto.createDecipheriv("aes-256-ctr", pass, iv);
			return ctx.params.pipe(decrypt);
		}
	}
});

let origHash;

const fileName = "d://1.pdf";
const fileName2 = "d://2.pdf";

broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(2000)
	.then(() => {
		broker1.repl();

		return getSHA(fileName).then(hash1 => {
			origHash = hash1;
			broker1.logger.info("Original SHA:", hash1);

			callAES();
		});

	});

function callAES() {
	const startTime = Date.now();

	const stream = fs.createReadStream(fileName);

	broker1.call("aes.encrypt", stream)
		.then(stream => broker1.call("aes.decrypt", stream))
		.then(stream => {
			const s = fs.createWriteStream(fileName2);
			stream.pipe(s);
			s.on("close", () => {
				const duration = Date.now() - startTime;
				getSHA(fileName2).then(hash => {
					if (hash != origHash) {
						broker1.logger.error(chalk.red.bold("Hash mismatch! Time:", duration, "ms. Received SHA:", hash));
					} else {
						broker1.logger.info(chalk.green.bold("Hash OK! Time:", duration, "ms. Received SHA:", hash));
					}

					setTimeout(() => callAES(), 100);
				});
			});
		})
		.catch(err => broker1.logger.error(err));
}

function getSHA(fileName) {
	return new Promise((resolve, reject) => {
		let hash = crypto.createHash("sha1");
		let stream = fs.createReadStream(fileName);
		stream.on("error", err => reject(err));
		stream.on("data", chunk => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}
