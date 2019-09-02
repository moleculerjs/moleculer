"use strict";

jest.mock("winston");

const Winston = require("winston");

const childFakeLogger = {
	error: jest.fn(),
	warn: jest.fn(),
	log: jest.fn(),
};
const fakeLogger = {
	child: jest.fn(() => childFakeLogger)
};
Winston.createLogger = jest.fn(() => fakeLogger);

const WinstonLogger = require("../../../src/loggers/winston");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const broker = new ServiceBroker({ logger: false });

describe("Test Winston logger class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const logger = new WinstonLogger();

			expect(logger.opts).toEqual({
				winston: {
					level: "silly",
				},
				createLogger: null,
				level: "info"
			});
		});

		it("should create with custom options", () => {
			const logger = new WinstonLogger({
				winston: {
					level: "info",
					transports: []
				},
				createLogger: jest.fn(),
				level: "debug"
			});

			expect(logger.opts).toEqual({
				winston: {
					level: "info",
					transports: []
				},
				createLogger: expect.any(Function),
				level: "debug"
			});
		});

	});

	describe("Test init method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a default logger", () => {
			const logger = new WinstonLogger();

			logger.init(loggerFactory);

			expect(logger.winston).toBe(fakeLogger);

			expect(Winston.createLogger).toHaveBeenCalledTimes(1);
			expect(Winston.createLogger).toHaveBeenCalledWith({ level: "silly" });
		});

		it("should create a default logger with custom options", () => {
			Winston.createLogger.mockClear();
			const logger = new WinstonLogger({
				winston: {
					transports: []
				},
			});

			logger.init(loggerFactory);

			expect(logger.winston).toBe(fakeLogger);

			expect(Winston.createLogger).toHaveBeenCalledTimes(1);
			expect(Winston.createLogger).toHaveBeenCalledWith({ level: "silly", transports: [] });
		});

	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a child logger", () => {
			const logger = new WinstonLogger({ level: "trace" });
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.winston.child).toHaveBeenCalledTimes(1);
			expect(logger.winston.child).toHaveBeenCalledWith({
				level: "trace",
				mod: "my-service",
				nodeID: "node-1"
			});

			logHandler("warn", ["message", { a: 5 }]);
			expect(childFakeLogger.warn).toHaveBeenCalledTimes(1);
			expect(childFakeLogger.warn).toHaveBeenCalledWith("message", { a: 5 });

			logHandler("fatal", ["message", { a: 5 }]);
			expect(childFakeLogger.error).toHaveBeenCalledTimes(1);
			expect(childFakeLogger.error).toHaveBeenCalledWith("message", { a: 5 });

			logHandler("trace", ["message", { a: 5 }]);
			expect(childFakeLogger.log).toHaveBeenCalledTimes(1);
			expect(childFakeLogger.log).toHaveBeenCalledWith("silly", "message", { a: 5 });
		});

		it("should call the createLogger function", () => {
			fakeLogger.child.mockClear();
			childFakeLogger.warn.mockClear();

			const mockFn = jest.fn(() => childFakeLogger);
			const logger = new WinstonLogger({
				createLogger: mockFn
			});
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.winston.child).toHaveBeenCalledTimes(0);
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
			fakeLogger.child.mockClear();
			childFakeLogger.warn.mockClear();

			const logger = new WinstonLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(1);
			expect(logger.getLogLevel).toHaveBeenCalledWith("my-service");
		});

		it("should not create child logger if bindings is null", () => {
			fakeLogger.child.mockClear();
			childFakeLogger.warn.mockClear();

			const logger = new WinstonLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(0);
		});

	});

});
