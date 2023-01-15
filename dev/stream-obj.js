"use strict";

const ServiceBroker = require("../src/service-broker");
const Stream = require("stream");

const broker = new ServiceBroker({
	nodeID: "sender",
	transporter: "NATS",
	serializer: "JSON",
	logLevel: "debug"
});

broker.createService({
	name: "sender",
	dependencies: ["echo"],

	actions: {
		send: {
			async handler(ctx) {
				const stream = new Stream.Readable({ objectMode: true, read() {} });
				for (let i = 0; i < 10; i++) {
					stream.push({ entry: i });
				}
				this.logger.info("sending stream...");
				const res = await ctx.call("echo.reply", null, { stream });
				this.logger.info("finished sending stream", res.readableObjectMode);

				res.on("data", data => {
					this.logger.info("data received", data);
				});

				res.on("error", err => {
					this.logger.error("error received", err);
				});

				res.on("end", () => {
					this.logger.error("receiving finished");
				});
			}
		}
	}
});

broker.start().then(async () => {
	broker.repl();
	await broker.Promise.delay(2000);
	broker.logger.info("Calling send...");
	await broker.call("sender.send");
});
