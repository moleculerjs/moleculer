"use strict";

global.tracer = require("dd-trace").init({
	service: "moleculer", // shows up as Service in Datadog UI
	//hostname: "agent", // references the `agent` service in docker-compose.yml
	debug: true,
	url: "http://192.168.0.181:8126",
	samplingPriority: "USER_KEEP",
});

global.tracer.use("http");
global.tracer.use("ioredis");

const ServiceBroker = require("../src/service-broker");
"use strict";

const { MoleculerError } 	= require("../src/errors");
const _ 					= require("lodash");
const { inspect }			= require("util");

const THROW_ERR = false;

// Create broker
const broker = new ServiceBroker({
	nodeID: "node-2",
	logger: console,
	logLevel: "info",
	logObjectPrinter: o => inspect(o, { showHidden: false, depth: 4, colors: true, breakLength: 50 }),
	transporter: "redis://localhost:6379",
	cacher: "redis://localhost:6379",
	tracing: {
		events: true,
		stackTrace: true,
		exporter: [
			{
				type: "Console",
				options: {
					logger: console
				}
			},
			/*{
				type: "Datadog",
				options: {
					agentUrl: "http://192.168.0.181:8126/v0.4/traces",
				}
			},*/
			{
				type: "Datadog2",
				options: {
					agentUrl: "http://192.168.0.181:8126",
					samplingPriority: "USER_KEEP",
					tracerOptions: {
						debug: true,
					}
				}
			},
			/*{
				type: "Zipkin",
				options: {
					baseURL: "http://192.168.0.181:9411",
				}
			},
			{
				type: "Jaeger",
				options: {
					host: "192.168.0.181",
				}
			}*/
			/*{
				type: "Event",
				options: {
				}
			}*/
			/*{
				type: "EventLegacy"
			}*/
		]
	}
});

broker.createService({
	name: "friends",
	actions: {
		count: {
			tracing: true,
			cache: true,
			handler(ctx) {
				if (THROW_ERR && ctx.params.userID == 1)
					throw new MoleculerError("Friends is not found!", 404, "FRIENDS_NOT_FOUND", { userID: ctx.params.userID });

				return this.Promise.resolve().delay(10 + _.random(60)).then(() => ctx.params.userID * 3);
			}
		}
	}
});

// Start server
broker.start().then(() => {
	broker.repl();
});
