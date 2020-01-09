"use strict";

const ServiceBroker = require("../src/service-broker");
const fs = require("fs");
const path = require("path");
const kleur = require("kleur");
const crypto = require("crypto");


const broker = new ServiceBroker({
	//namespace: "streaming",
	nodeID: "node-client-" + process.pid,
	//transporter: "nats://192.168.51.100:4222",
	transporter: "redis://192.168.51.100:6379",
	serializer: "MsgPack",
	logger: console,
	logLevel: "debug"
});

let startTime, origHash;

/*
const file = "grpc-netty-shaded-1.10.1.jar";
broker.start()
	.delay(2000)
	.then(() => {
		startTime = Date.now();
		return broker.call("stream.getFile", { file });
	})
	.then(stream => {
		const s = fs.createWriteStream(path.join("d:", file));
		stream.pipe(s);
		s.on("close", () => {
			broker.logger.info("Time:", Date.now() - startTime + "ms");
			broker.logger.info(kleur.green().bold("File received OK!"));
			broker.stop();
		});
	});
*/

/*
broker.start()
	.delay(2000)
	.then(() => {

		const fileName = "d://1.pdf";

		return getSHA(fileName).then(hash1 => {
			origHash = hash1;
			broker.logger.info("Original SHA:", hash1);

			const startTime = Date.now();

			const stream = fs.createReadStream(fileName);

			broker.call("stream.sha", stream)
				.then(({ digest }) => {
					broker.logger.info("Time:", Date.now() - startTime + "ms");
					broker.logger.info("Received SHA:", digest);

					if (digest != origHash) {
						broker.logger.error(kleur.red().bold("Hash mismatch!"));
					} else {
						broker.logger.info(kleur.green().bold("Hash OK!"));
					}

					broker.stop();
				});
		});
	});
*/


broker.start()
	.delay(2000)
	.then(() => {

		const fileName = "d://1.pdf";
		const fileName2 = "d://2.pdf";

		return getSHA(fileName).then(hash1 => {
			origHash = hash1;
			broker.logger.info("Original SHA:", hash1);

			const startTime = Date.now();

			const stream = fs.createReadStream(fileName);

			broker.call("echo.reply", stream)
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


/*
broker.start()
	.delay(2000)
	.then(() => {
		return broker.call("stream.listFiles");
	})
	.then(res => {
		broker.logger.info(res);

		broker.stop();
	});
*/

function getSHA(fileName) {
	return new Promise((resolve, reject) => {
		let hash = crypto.createHash("sha256");
		let stream = fs.createReadStream(fileName);
		stream.on("error", err => reject(err));
		stream.on("data", chunk => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("base64")));
	});
}

