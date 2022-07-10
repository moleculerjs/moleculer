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
				this.logger.info("call receive handler", ctx.params);
				if (ctx.params) {
					const participants = [];
					ctx.params.on("data", d => participants.push(d));
					ctx.params.on("end", () =>
						this.logger.info("received stream data", participants.length)
					);
					return "OK";
				} else {
					this.logger.error("No stream", ctx.params, ctx.meta);
					return "no stream";
				}
			}
		}
	}
});

broker.start().then(() => broker.repl());
