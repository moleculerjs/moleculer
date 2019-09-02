"use strict";

const Loggers = require("../../src/loggers");
const LoggerFactory = require("../../src/logger-factory");
const ServiceBroker = require("../../src/service-broker");
// const { protectReject } = require("./utils");

describe("Test LoggerFactory", () => {

	const broker = new ServiceBroker({ logger: false });

	it("test constructor", () => {

		let loggerFactory = new LoggerFactory(broker);

		expect(loggerFactory.broker).toBe(broker);
		expect(loggerFactory.appenders).toBeInstanceOf(Array);
		expect(loggerFactory.cache).toBeInstanceOf(Map);
	});

	describe("Test init method", () => {
		const loggerFactory = new LoggerFactory(broker);
		const mockInit = jest.fn();
		Loggers.resolve = jest.fn(() => ({ init: mockInit }));

		it("should not add appenders", () => {
			loggerFactory.init(null);
			expect(loggerFactory.appenders.length).toBe(0);
			expect(Loggers.resolve).toHaveBeenCalledTimes(0);

			loggerFactory.init(false);
			expect(loggerFactory.appenders.length).toBe(0);
			expect(Loggers.resolve).toHaveBeenCalledTimes(0);
		});

		it("should add default console appender", () => {
			loggerFactory.init(true);
			expect(loggerFactory.appenders.length).toBe(1);

			expect(Loggers.resolve).toHaveBeenCalledTimes(1);
			expect(Loggers.resolve).toHaveBeenCalledWith({
				type: "Console",
				options: {
					level: "info"
				}
			});

			expect(mockInit).toHaveBeenCalledTimes(1);
		});

		it("should add default console appender", () => {
			broker.options.logLevel = "debug";
			Loggers.resolve.mockClear();
			mockInit.mockClear();

			loggerFactory.init(console);
			expect(loggerFactory.appenders.length).toBe(1);

			expect(Loggers.resolve).toHaveBeenCalledTimes(1);
			expect(Loggers.resolve).toHaveBeenCalledWith({
				type: "Console",
				options: {
					level: "debug"
				}
			});

			expect(mockInit).toHaveBeenCalledTimes(1);
		});

		it("should add an appender by object", () => {
			broker.options.logLevel = "debug";
			Loggers.resolve.mockClear();
			mockInit.mockClear();

			loggerFactory.init({
				type: "Pino",
				options: {
					pino: {
						a: 5
					}
				}
			});
			expect(loggerFactory.appenders.length).toBe(1);

			expect(Loggers.resolve).toHaveBeenCalledTimes(1);
			expect(Loggers.resolve).toHaveBeenCalledWith({
				type: "Pino",
				options: {
					level: "debug",
					pino: {
						a: 5
					}
				}
			});

			expect(mockInit).toHaveBeenCalledTimes(1);
			expect(mockInit).toHaveBeenCalledWith(loggerFactory);
		});

		it("should add an appender by string", () => {
			broker.options.logLevel = "debug";
			Loggers.resolve.mockClear();
			mockInit.mockClear();

			loggerFactory.init("Pino");
			expect(loggerFactory.appenders.length).toBe(1);

			expect(Loggers.resolve).toHaveBeenCalledTimes(1);
			expect(Loggers.resolve).toHaveBeenCalledWith({
				type: "Pino",
				options: {
					level: "debug"
				}
			});

			expect(mockInit).toHaveBeenCalledTimes(1);
			expect(mockInit).toHaveBeenCalledWith(loggerFactory);
		});

		it("should add multiple appenders", () => {
			broker.options.logLevel = "warn";
			Loggers.resolve.mockClear();
			mockInit.mockClear();

			loggerFactory.init([
				{
					type: "Console",
					options: {
						moduleColors: true
					}
				},
				{
					type: "File",
					options: {
						folder: "./my-logs"
					}
				}
			]);
			expect(loggerFactory.appenders.length).toBe(2);

			expect(Loggers.resolve).toHaveBeenCalledTimes(2);
			expect(Loggers.resolve).toHaveBeenNthCalledWith(1, {
				type: "Console",
				options: {
					level: "warn",
					moduleColors: true
				}
			});
			expect(Loggers.resolve).toHaveBeenNthCalledWith(2, {
				type: "File",
				options: {
					level: "warn",
					folder: "./my-logs"
				}
			});

			expect(mockInit).toHaveBeenCalledTimes(2);
		});

		it("should add multiple appenders by strings", () => {
			broker.options.logLevel = "info";
			Loggers.resolve.mockClear();
			mockInit.mockClear();

			loggerFactory.init(["Console", "File"]);
			expect(loggerFactory.appenders.length).toBe(2);

			expect(Loggers.resolve).toHaveBeenCalledTimes(2);
			expect(Loggers.resolve).toHaveBeenNthCalledWith(1, {
				type: "Console",
				options: {
					level: "info"
				}
			});
			expect(Loggers.resolve).toHaveBeenNthCalledWith(2, {
				type: "File",
				options: {
					level: "info"
				}
			});

			expect(mockInit).toHaveBeenCalledTimes(2);
		});

		it("should throw error if options is invalid", () => {
			expect(() => {
				loggerFactory.init(5);
			}).toThrow("Invalid logger configuration.");
		});
	});

	describe("Test getLogger method", () => {
		const loggerFactory = new LoggerFactory(broker);

		const loggerInterface = {
			fatal: expect.any(Function),
			error: expect.any(Function),
			warn: expect.any(Function),
			info: expect.any(Function),
			debug: expect.any(Function),
			trace: expect.any(Function)
		};

		let logger;
		it("should return a logger object", () => {
			expect(loggerFactory.cache.size).toBe(0);
			logger = loggerFactory.getLogger({ mod: "my-service" });
			expect(logger).toEqual(Object.assign({ appenders: [] }, loggerInterface));
			expect(loggerFactory.cache.size).toBe(1);
		});

		it("should return the cached logger", () => {
			const logger2 = loggerFactory.getLogger({ mod: "my-service" });
			expect(logger2).toBe(logger);
			expect(loggerFactory.cache.size).toBe(1);
		});

		it("should not return the cached logger", () => {
			const logger3 = loggerFactory.getLogger({ mod: "your-service" });
			expect(logger3).not.toBe(logger);
			expect(loggerFactory.cache.size).toBe(2);

			const logger4 = loggerFactory.getLogger({ mod: "my-service", ns: "other" });
			expect(logger4).not.toBe(logger);
			expect(logger4).not.toBe(logger3);
			expect(loggerFactory.cache.size).toBe(3);
		});

		it("should call log handlers middlewares", () => {
			broker.middlewares.callSyncHandlers = jest.fn();

			const handler1 = jest.fn();
			const handler2 = jest.fn();

			loggerFactory.appenders = [
				{ getLogHandler: jest.fn(bindings => handler1 ) },
				{ getLogHandler: jest.fn(bindings => null ) },
				{ getLogHandler: jest.fn(bindings => handler2 ) }
			];

			const bindings = { mod: "posts", nodeID: "node-1" };
			const logger = loggerFactory.getLogger(bindings);

			logger.info("message", { a: 5 });

			expect(broker.middlewares.callSyncHandlers).toHaveBeenCalledTimes(1);
			expect(broker.middlewares.callSyncHandlers).toHaveBeenCalledWith("newLogEntry", ["info", ["message", { a: 5 }], bindings], {});

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler1).toHaveBeenCalledWith("info", ["message", { a: 5 }]);

			expect(handler2).toHaveBeenCalledTimes(1);
			expect(handler2).toHaveBeenCalledWith("info", ["message", { a: 5 }]);
		});
	});

	describe("Test getBindingsKey method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a key from bindings", () => {
			expect(loggerFactory.getBindingsKey()).toBe("");
			expect(loggerFactory.getBindingsKey({})).toBe("||");
			expect(loggerFactory.getBindingsKey({ mod: "service" })).toBe("||service");
			expect(loggerFactory.getBindingsKey({ mod: "service", ns: "namespace", nodeID: "node-123" })).toBe("node-123|namespace|service");
		});
	});

});

