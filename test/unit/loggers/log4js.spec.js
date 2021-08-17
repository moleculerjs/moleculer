"use strict";

jest.mock("log4js");

const Log4js = require("log4js");

const Log4jsLogger = require("../../../src/loggers/log4js");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const childFakeLogger = { warn: jest.fn() };
Log4js.getLogger = jest.fn(() => childFakeLogger);

const broker = new ServiceBroker({ logger: false });

describe("Test Log4js logger class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const logger = new Log4jsLogger();

			expect(logger.opts).toEqual({
				createLogger: null,
				level: "info"
			});
		});

		it("should create with custom options", () => {
			const logger = new Log4jsLogger({
				a: 5,
				createLogger: jest.fn(),
				level: "debug"
			});

			expect(logger.opts).toEqual({
				a: 5,
				createLogger: expect.any(Function),
				level: "debug"
			});
		});
	});

	describe("Test init method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a default logger without config", () => {
			const logger = new Log4jsLogger();

			logger.init(loggerFactory);

			expect(logger.log4js).toBe(Log4js);

			expect(Log4js.configure).toHaveBeenCalledTimes(0);
		});

		it("should create a default logger with config", () => {
			const logger = new Log4jsLogger({
				log4js: {
					a: 5
				}
			});

			logger.init(loggerFactory);

			expect(logger.log4js).toBe(Log4js);

			expect(Log4js.configure).toHaveBeenCalledTimes(1);
			expect(Log4js.configure).toHaveBeenCalledWith({ a: 5 });
		});
	});

	describe("Test stop method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a default logger", async () => {
			const logger = new Log4jsLogger({
				log4js: {}
			});

			logger.init(loggerFactory);

			logger.log4js.shutdown = jest.fn(cb => cb());

			await logger.stop();

			expect(logger.log4js.shutdown).toHaveBeenCalledTimes(1);
		});
	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a child logger", () => {
			const logger = new Log4jsLogger();
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.log4js.getLogger).toHaveBeenCalledTimes(1);
			expect(logger.log4js.getLogger).toHaveBeenCalledWith("MY-SERVICE");

			logHandler("warn", ["message", { a: 5 }]);
			expect(childFakeLogger.warn).toHaveBeenCalledTimes(1);
			expect(childFakeLogger.warn).toHaveBeenCalledWith("message", { a: 5 });
		});

		it("should call the createLogger function", () => {
			Log4js.getLogger.mockClear();
			childFakeLogger.warn.mockClear();

			const mockFn = jest.fn(() => childFakeLogger);
			const logger = new Log4jsLogger({
				createLogger: mockFn
			});
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.log4js.getLogger).toHaveBeenCalledTimes(0);
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenCalledWith("info", {
				mod: "my-service",
				nodeID: "node-1"
			});

			logHandler("warn", ["message", { a: 5 }]);
			expect(childFakeLogger.warn).toHaveBeenCalledTimes(1);
			expect(childFakeLogger.warn).toHaveBeenCalledWith("message", { a: 5 });
		});

		it("should not create child logger if level is null", () => {
			Log4js.getLogger.mockClear();
			childFakeLogger.warn.mockClear();

			const logger = new Log4jsLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(1);
			expect(logger.getLogLevel).toHaveBeenCalledWith("my-service");
		});

		it("should not create child logger if bindings is null", () => {
			Log4js.getLogger.mockClear();
			childFakeLogger.warn.mockClear();

			const logger = new Log4jsLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(0);
		});
	});
});
