"use strict";

const ServiceBroker = require("../src/service-broker");
const TransitLogger = require("../src/middlewares/debugging/transit-logger");
const TransmitCompression = require("../src/middlewares/transmit/compression");
const Stream = require("stream");

const broker = new ServiceBroker({
	nodeID: "receiver",
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
	name: "receiver",
	/**
	 * Actions
	 */
	actions: {
		receive: {
			async handler(ctx) {
				// ! called two times if meta is "large"
				this.logger.info("call receive handler", ctx.params, ctx.meta);
				if (ctx.stream) {
					const participants = [];
					ctx.stream.on("data", d => participants.push(d));
					ctx.stream.on("end", () =>
						this.logger.info("received stream data", participants.length, ctx.meta)
					);
					return "OK";
				} else {
					this.logger.error("No stream", ctx.stream, ctx.meta);
					return "no stream";
				}
			}
		}
	}
});

broker.start().then(() => broker.repl());
