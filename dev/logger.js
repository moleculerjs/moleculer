"use strict";

const ServiceBroker = require("../src/service-broker");
const winston = require("winston");
const kleur = require("kleur");

function logging(module) {
	module.logger.trace("Trace message");
	module.logger.debug("Debug message");
	module.logger.info("Info message next object", { a: 5, b: "John", c: true, d: new Date() });
	module.logger.info({ a: 5, b: "John", c: true, d: new Date() }, "Info message prev object");
	module.logger.info({ a: "only object", b: 5, c: true, d: new Date() });
	module.logger.warn("Warn message");
	module.logger.error("Error message");
	//module.logger.error(new Error("Something happened!"));
	module.logger.fatal("Fatal error");
}

function createBroker(options) {
	const broker = new ServiceBroker(options);

	broker.createService({
		name: "greeter",
		version: 2,
		started() {
			this.logger.info("Service started!");
		}
	});

	return broker;
}

(function() {
	console.log(kleur.yellow().bold("\n--- CONSOLE ---"));
	const broker = createBroker({
		nodeID: "console",
		logger: {
			type: "Console",
			options: {
				moduleColors: true
			}
		},
		logLevel: "debug",
		//transporter: "NATS",
		cacher: "Memory"
	});
	logging(broker);
	broker.start();
})();

(function() {
	console.log(kleur.yellow().bold("\n--- PINO ---"));
	const broker = createBroker({
		nodeID: "pino",
		logger: {
			type: "Pino",
		},
		logLevel: "debug",
		//transporter: "NATS",
		cacher: "Memory"
	});
	logging(broker);
	broker.start();
})();

(function() {
	console.log(kleur.yellow().bold("\n--- BUNYAN ---"));
	const bunyan = require("bunyan");
	const logger = bunyan.createLogger({ name: "moleculer", level: "debug" });
	const broker = createBroker({
		nodeID: "bunyan",
		logger: {
			type: "Bunyan",
			options: {
				bunyan: {
					name: "my-app"
				}
			}
		},
		// transporter: "NATS",
		cacher: "Memory"
	});

	logging(broker);
	broker.start();
})();

(function() {
	console.log(kleur.yellow().bold("\n--- WINSTON ---"));
	const winston = require("winston");
	const broker = createBroker({
		nodeID: "winston",
		logger: {
			type: "Winston",
			options: {
				winston: {
					format: winston.format.combine(
						//winston.format.label({ label: bindings }),
						winston.format.timestamp(),
						winston.format.json(),
					),
					transports: [
						new winston.transports.Console()
					]
				}
			}
		},
		// transporter: "NATS",
		cacher: "Memory"
	});
	logging(broker);
	broker.start();
})();

console.log(kleur.yellow().bold("-----------------\n"));
