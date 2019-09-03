"use strict";

const ServiceBroker = require("../src/service-broker");
const { MoleculerClientError } = require("../src/errors");

const _ = require("lodash");
const winston = require("winston");
const kleur = require("kleur");

function logging(broker) {
	const myLogger = broker.getLogger("my.custom.module");

	myLogger.trace("Trace message");
	myLogger.debug("Debug message");
	myLogger.info("Info message next object", { a: 5, b: "John", c: true, d: new Date() });
	myLogger.info({ a: 5, b: "John", c: true, d: new Date() }, "Info message prev object");
	myLogger.info({ a: "only object", b: 5, c: true, d: new Date() });
	myLogger.warn("Warn message");
	myLogger.error("Error message", new MoleculerClientError("Something happened", 404));
	myLogger.fatal("Fatal error");
}

let brk;

function createBroker(options) {
	const broker = new ServiceBroker(_.defaultsDeep(options, {
		cacher: "Memory"
	}));

	broker.createService({
		name: "greeter",
		version: 2,
		created() {
			this.logger.debug("Service created!");
		},
		started() {
			this.logger.info("Service started!");
		}
	});

	return broker;
}

Promise.resolve()
	.then(async function() {
		console.log(kleur.yellow().bold("\n--- CONSOLE LOGGER ---"));
		const broker = createBroker({
			nodeID: "console",
			logger: {
				type: "Console",
				options: {
					level: "trace",
					//formatter: "short",
					moduleColors: true,
					//autoPadding: true
				}
			}
		});
		await broker.start();

		logging(broker);

		brk = broker;
	})
	.then(async function() {
		console.log(kleur.yellow().bold("\n--- BUNYAN LOGGER ---"));
		const broker = createBroker({
			nodeID: "bunyan",
			logger: {
				type: "Bunyan",
				options: {
					level: "trace",
					bunyan: {
						name: "moleculer"
					}
				}
			}
		});
		await broker.start();

		logging(broker);
	})
	.then(async function() {
		console.log(kleur.yellow().bold("\n--- PINO LOGGER ---"));
		const broker = createBroker({
			nodeID: "pino",
			logger: {
				type: "Pino",
				options: {
					level: "trace",
					pino: {
						options: {
							base: null
						},
						//destination: "d:/pino.log"
					}
				}
			}
		});
		await broker.start();

		logging(broker);
	})
	.then(async function() {
		console.log(kleur.yellow().bold("\n--- WINSTON LOGGER ---"));
		const broker = createBroker({
			nodeID: "winston",
			logger: {
				type: "Winston",
				options: {
					level: "trace",
					winston: {
						transports: [
							new winston.transports.Console(),
							//new winston.transports.File({ filename: "./logs/winston.log" })
						]
					}
				}
			}
		});
		await broker.start();

		logging(broker);
	})
	.then(async function() {
		console.log(kleur.yellow().bold("\n--- DEBUG LOGGER (should set `DEBUG=moleculer:*` env var) ---"));
		const broker = createBroker({
			nodeID: "debug",
			logger: {
				type: "Debug",
				options: {
					level: "trace"
				}
			}
		});
		await broker.start();

		logging(broker);
	})
	.then(async function() {
		console.log(kleur.yellow().bold("\n--- Log4JS LOGGER ---"));
		const broker = createBroker({
			nodeID: "log4js",
			logger: {
				type: "Log4js",
				options: {
					level: "trace",
					/*log4js: {
						appenders: {
							app: { type: "file", filename: "./logs/log4js.log" }
						},
						categories: {
							default: { appenders: [ "app" ], level: "debug" }
						}
					}*/
				}
			}
		});
		await broker.start();

		logging(broker);
	})
	.then(() => console.log(kleur.yellow().bold("-----------------\n")))
	.then(() => brk.repl());
