"use strict";

const ServiceBroker = require("../src/service-broker");
const { extend } = require("../src/logger");
const winston = require("winston");

const broker = new ServiceBroker({
	logger: [
		{
			type: "Console",
			options: {
				//level: "error",
				//formatter: (type, args, bindings) => [].concat(args, bindings)
				//formatter: "simple",
				moduleColors: true,
				autoPadding: true
			}
		},
		/*{
			type: "Pino",
			options: {
				pino: {
					options: {
						base: null
					},
					//destination: "d:/pino.log"
				}
			}
		},*/
		/*{
			type: "Bunyan",
			options: {
				bunyan: {
					name: "my-app"
				}
			}
		},*/
		/*{
			type: "Winston",
			options: {
				winston: {
					transports: [
						new winston.transports.Console(),
						new winston.transports.File({ filename: "d:/winston.log" })
					]
				}
			}
		},*/
		/*{
			type: "Debug",
			options: {

			}
		}*/
	],
	logLevel: {
		//"MY.**": false,
		"TRANS*": "warn",
		"*.GREETER": "debug",
		"**": "debug",
	},
	//logLevel: "info",
	//logFormatter: "short",
	transporter: "NATS",
	cacher: "Memory"
});

const schema = {
	created() {
		this.logger.debug("Service created!");
	},
	started() {
		this.logger.info("Service started!");
	}
};

broker.createService({
	name: "greeter",
	version: 2
}, schema);

broker.createService({
	name: "test"
}, schema);

broker.createService({
	name: "hello"
}, schema);

const myLogger = broker.getLogger("my.custom.module");

myLogger.trace("Trace test");
myLogger.debug("Debug test");
myLogger.info("Info test");
myLogger.warn("Warn test");
myLogger.error("Error test");

myLogger.info("Object test - after", { a: 5, b: { c: "John" } });
myLogger.info({ a: 5, b: { c: "John" } }, "Object test - before");


broker.start();
