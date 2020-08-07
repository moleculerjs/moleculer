"use strict";

const ServiceBroker = require("../src/service-broker");
const winston = require("winston");
const kleur = require("kleur");
const { MoleculerClientError } = require("../src/errors");

const broker = new ServiceBroker({
	nodeID: "my-node",
	logger: [
		{
			type: "Console",
			options: {
				//level: "error",
				//formatter: (level, args, bindings) => [`[${level.toUpperCase()}]`, ...args],
				//formatter: "[{time}] {level} <{nodeID}:{mod}> ->",
				moduleColors: true,
				//autoPadding: true
			}
		},
		{
			type: "File",
			options: {
				folder: "d:/logs",
				filename: "moleculer-{date}.log",
				formatter: "full"
			}
		},
		/*{
			type: "File",
			options: {
				level: "error",
				folder: "d:/logs",
				filename: "moleculer-errors-{date}.log",
				formatter: "json"
			}
		},*/
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
		},*/
		/*{
			type: "Log4js",
			options: {
				log4js: {
					appenders: {
						app: { type: "file", filename: "d:/log4js.log" }
					},
					categories: {
						default: { appenders: [ "app" ], level: "debug" }
					}
				}
			}
		},*/
		/*{
			type: "Datadog",
			options: {
			}
		}*/
	],
	logLevel: {
		"MY.**": "trace",
		"TRANS*": "warn",
		"*.GREETER": "debug",
		"**": "debug",
	},
	//logLevel: "info",
	//logFormatter: "short",
	transporter: "NATS",
	cacher: "Memory"
});

let c = 0;
const schema = {
	created() {
		this.logger.debug("Service created!");
	},
	started() {
		this.logger.info("Service started!");
		/*this.timer = setInterval(() => {
			this.logger.info(`Timer ${c++}...`);
			this.logger.info(`Timer ${c++}...`);
			this.logger.info(`Timer ${c++}...`);
		}, 1000);*/
	},

	stopped() {
		clearInterval(this.timer);
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
myLogger.info("Info test", kleur.yellow().bold("with colors"));
myLogger.warn("Warn test");
myLogger.error("Error test", new MoleculerClientError("Something happened", 404));

myLogger.info("Object test - after", { a: 5, b: { c: "John" } });
myLogger.info({ a: 5, b: { c: "John" } }, "Object test - before");


broker.start();
broker.repl();

//setTimeout(() => broker.stop(), 4000);
