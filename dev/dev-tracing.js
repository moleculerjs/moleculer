"use strict";

const ServiceBroker = require("../src/service-broker");
const util = require("util");

const broker = new ServiceBroker({
	nodeID: "dev-tracing",// + process.pid,
	//transporter: "TCP",
	tracing: {
		enabled: true,
		exporters: null
	},
	logLevel: "debug",
	//logObjectPrinter: o => util.inspect(o, { depth: 4, colors: true, breakLength: 50 }), // `breakLength: 50` activates multi-line object
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			params: {
				name: "string"
			},
			// tracing: false,
			tracing: {
				//tags: ["name", "#user.id"]
				tags: {
					"hello.name": "name"
				}
			},
			handler(ctx) {
				return `Hello ${ctx.params.name}!`;
			}
		}
	}
});
function getElapsedTime(start) {
	const diff = process.hrtime(start);
	return (diff[0] * 1e3) + (diff[1] / 1e6);
}

broker.loadService("./examples/post.service.js");

broker.start()
	.then(() => broker.repl())
	.delay(1000)
	.then(() => {
		setInterval(async () => {
			broker.logger.info("      ");
			try {
				const start = process.hrtime();
				//const span = broker.tracer.startSpan("call 'greeter.hello' action");
				const res = await broker.call("greeter.hello", { name: "Moleculer" });
				//span.finish();
				broker.logger.info("Time:", getElapsedTime(start).toFixed(3) + "ms");
			} catch(err) {
				broker.logger.error(err);
			}
		}, 1000);
	})
	.catch(err => broker.logger.error(err));
