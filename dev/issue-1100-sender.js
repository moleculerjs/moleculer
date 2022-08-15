"use strict";

const ServiceBroker = require("../src/service-broker");
const TransitLogger = require("../src/middlewares/debugging/transit-logger");
const TransmitCompression = require("../src/middlewares/transmit/compression");
const Stream = require("stream");

const broker = new ServiceBroker({
	nodeID: "sender",
	transporter: "NATS",
	serializer: "JSON",

	requestTimeout: 10 * 1000,

	middlewares: [
		TransmitCompression({ method: "gzip" })
		/*TransitLogger({
			folder: "logs/transit"
		})*/
	]
});

broker.createService({
	name: "sender",
	dependencies: ["receiver"],

	actions: {
		send: {
			async handler(ctx) {
				const participants = [];
				for (let i = 0; i < 100000; i++) {
					participants.push({ entry: i });
				}
				const stream = new Stream.Readable();
				stream.push(Buffer.from(JSON.stringify(participants)));
				stream.push(null);
				this.logger.info("sending stream...");
				const res = await ctx.call("receiver.receive", stream, {
					meta: {
						//! meta data is missing on receiver side
						testMeta: "testMeta",
						participants: participants.slice(0, 100)
					}
				});
				this.logger.info("finished sending stream", res);
				return res;
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
