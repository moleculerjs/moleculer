"use strict";

const ServiceBroker = require("../src/service-broker");
const { extend } = require("../src/logger");
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
		logger: console,
		logLevel: "debug",
		/*logFormatter(level, args, meta) {
			return level.toUpperCase() + " " + meta.nodeID + ": " + args.join(" ");
		},*/
		transporter: "NATS",
		cacher: "Memory"
	});
	logging(broker);
	broker.start();
})();

(function() {
	console.log(kleur.yellow().bold("\n--- PINO ---"));
	const pino = require("pino")({ level: "debug" });
	const broker = createBroker({
		logger: bindings => pino.child(bindings),
		transporter: "NATS",
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
		logger: bindings => logger.child(bindings),
		transporter: "NATS",
		cacher: "Memory"
	});

	logging(broker);
	broker.start();
})();

(function() {
	console.log(kleur.yellow().bold("\n--- WINSTON ---"));
	const winston = require("winston");
	const broker = createBroker({
		logger: bindings => extend(winston.createLogger({
			format: winston.format.combine(
				winston.format.label({ label: bindings }),
				winston.format.timestamp(),
				winston.format.json(),
			),
			transports: [
				new winston.transports.Console()
			]
		})),
		transporter: "NATS",
		cacher: "Memory"
	});
	logging(broker);
	broker.start();
})();
/*
(function() {
	console.log(kleur.yellow().bold("\n--- WINSTON CONTEXT ---"));
	const WinstonContext = require("winston-context");
	const winston = require("winston");
	const broker = createBroker({
		logger: bindings => extend(new WinstonContext(winston.createLogger({
			transports: [
				new winston.transports.Console({
					timestamp: true,
					colorize: true,
					prettyPrint: true
				})
			]
		}), "", bindings)),
		transporter: "NATS",
		cacher: "Memory"
	});
	logging(broker);
	broker.start();
})();

*/
console.log(kleur.yellow().bold("-----------------\n"));
