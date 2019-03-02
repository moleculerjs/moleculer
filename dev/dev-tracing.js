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
				const span = ctx.startSpan("templating", { tags: { params: ctx.params }});
				const str = `Hello ${ctx.params.name}!`;
				span.finish();
				return str;
			}
		}
	}
});

broker.loadService("./examples/post.service.js");

broker.start()
	.then(() => broker.repl())
	.delay(1000)
	.then(() => {
		setInterval(async () => {
			broker.logger.info("      ");
			try {
				const res = await broker.call("greeter.hello", { name: "Moleculer" });
			} catch(err) {
				broker.logger.error(err);
			}
		}, 1000);
	})
	.catch(err => broker.logger.error(err));
