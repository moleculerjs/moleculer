"use strict";

/*const tracer = require("dd-trace").init({
	service: "moleculer", // shows up as Service in Datadog UI
	url: "http://127.0.0.1:8126",
	debug: true,
	samplingPriority: "USER_KEEP"
});

tracer.use("http");
tracer.use("ioredis");
*/
const ServiceBroker = require("../src/service-broker");
("use strict");

const { MoleculerError } = require("../src/errors");
const _ = require("lodash");
const { inspect } = require("util");

const THROW_ERR = false;

// Create broker
const broker = new ServiceBroker({
	nodeID: "node-1",
	logger: console,
	logLevel: "info",
	//transporter: "redis://localhost:6379",
	//cacher: true, //"redis://localhost:6379",

	tracing: {
		events: true,
		stackTrace: true,
		sampling: {
			rate: 1
			//tracesPerSecond: 1
		},
		exporter: [
			/*{
				type: "Console",
				options: {
					width: 100,
					gaugeWidth: 30,
					logger: console.info
				}
			},*/
			/*{
				type: "Datadog",
				options: {
					tracer
				}
			}*/
			{
				type: "Zipkin",
				options: {
					safetyTags: false,
					baseURL: "http://127.0.0.1:9411"
				}
			},
			{
				type: "Jaeger",
				options: {
					safetyTags: false,
					endpoint: "http://localhost:14268/api/traces"
				}
			}
			/*{
				type: "Event",
				options: {
				}
			}*/
		]
	}
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			tracing: {
				safetyTags: true
			},
			handler(ctx) {
				return `Hello!`;
			}
		}
	}
});

// Start server
broker.start().then(() => {
	broker.repl();

	const a = {
		aa: 5,
		c: "John"
	};
	const b = {
		bb: 10,
		a: a
	};

	a.b = b;

	// Call action
	setInterval(() => {
		broker.call("greeter.hello", a).then(console.log).catch(console.error);
	}, 5000);
});
