"use strict";

const kleur = require("kleur");
kleur.enabled = false;

const ConsoleLogger = require("../../../src/loggers/console");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const lolex = require("@sinonjs/fake-timers");

const broker = new ServiceBroker({ logger: false });

describe("Test Console logger class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const logger = new ConsoleLogger();

			expect(logger.opts).toEqual({
				createLogger: null,
				level: "info",
				colors: true,
				moduleColors: false,
				formatter: "full",
				objectPrinter: null,
				autoPadding: false
			});

			expect(logger.maxPrefixLength).toBe(0);
		});

		it("should create with custom options", () => {
			const logger = new ConsoleLogger({
				createLogger: jest.fn(),
				level: "debug",
				colors: false,
				formatter: "simple"
			});

			expect(logger.opts).toEqual({
				createLogger: expect.any(Function),
				level: "debug",
				colors: false,
				moduleColors: false,
				formatter: "simple",
				objectPrinter: null,
				autoPadding: false
			});
		});
	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);
		console.error = jest.fn();
		console.warn = jest.fn();
		console.log = jest.fn();

		it("should create a child logger", () => {
			const logger = new ConsoleLogger({ level: "trace" });
			logger.init(loggerFactory);
			logger.getFormatter = jest.fn(() => (type, args) => args);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.getFormatter).toHaveBeenCalledTimes(1);
			expect(logger.getFormatter).toHaveBeenCalledWith({
				mod: "my-service",
				nodeID: "node-1"
			});

			logHandler("fatal", ["message", { a: 5 }]);
			expect(console.error).toHaveBeenCalledTimes(1);
			expect(console.error).toHaveBeenCalledWith("message", { a: 5 });

			console.error.mockClear();
			logHandler("error", ["message", { a: 5 }]);
			expect(console.error).toHaveBeenCalledTimes(1);
			expect(console.error).toHaveBeenCalledWith("message", { a: 5 });

			console.warn.mockClear();
			logHandler("warn", ["message", { a: 5 }]);
			expect(console.warn).toHaveBeenCalledTimes(1);
			expect(console.warn).toHaveBeenCalledWith("message", { a: 5 });

			console.log.mockClear();
			logHandler("info", ["message", { a: 5 }]);
			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith("message", { a: 5 });

			console.log.mockClear();
			logHandler("debug", ["message", { a: 5 }]);
			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith("message", { a: 5 });

			console.log.mockClear();
			logHandler("trace", ["message", { a: 5 }]);
			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith("message", { a: 5 });
		});

		it("should not call console if level is lower", () => {
			const logger = new ConsoleLogger({ level: "info" });
			logger.init(loggerFactory);
			logger.getFormatter = jest.fn(() => (type, args) => args);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.getFormatter).toHaveBeenCalledTimes(1);
			expect(logger.getFormatter).toHaveBeenCalledWith({
				mod: "my-service",
				nodeID: "node-1"
			});

			console.error.mockClear();
			logHandler("fatal", ["message", { a: 5 }]);
			expect(console.error).toHaveBeenCalledTimes(1);
			expect(console.error).toHaveBeenCalledWith("message", { a: 5 });

			console.error.mockClear();
			logHandler("error", ["message", { a: 5 }]);
			expect(console.error).toHaveBeenCalledTimes(1);
			expect(console.error).toHaveBeenCalledWith("message", { a: 5 });

			console.warn.mockClear();
			logHandler("warn", ["message", { a: 5 }]);
			expect(console.warn).toHaveBeenCalledTimes(1);
			expect(console.warn).toHaveBeenCalledWith("message", { a: 5 });

			console.log.mockClear();
			logHandler("info", ["message", { a: 5 }]);
			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.log).toHaveBeenCalledWith("message", { a: 5 });

			console.log.mockClear();
			logHandler("debug", ["message", { a: 5 }]);
			expect(console.log).toHaveBeenCalledTimes(0);

			console.log.mockClear();
			logHandler("trace", ["message", { a: 5 }]);
			expect(console.log).toHaveBeenCalledTimes(0);
		});

		it("should not create child logger if level is null", () => {
			const logger = new ConsoleLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(1);
			expect(logger.getLogLevel).toHaveBeenCalledWith("my-service");
		});

		it("should not create child logger if bindings is null", () => {
			const logger = new ConsoleLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(0);
		});
	});
});
