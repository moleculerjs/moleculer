"use strict";

jest.mock("debug");

const Debug = require("debug");

const childFakeLogger = jest.fn();
const fakeLogger = {
	extend: jest.fn(() => childFakeLogger)
};
Debug.mockImplementation(() => fakeLogger);

const DebugLogger = require("../../../src/loggers/debug");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const broker = new ServiceBroker({ logger: false });

describe("Test Debug logger class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const logger = new DebugLogger();

			expect(logger.opts).toEqual({
				createLogger: null,
				level: "info"
			});
		});

		it("should create with custom options", () => {
			const logger = new DebugLogger({
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

		it("should create a default logger", () => {
			const logger = new DebugLogger();

			logger.init(loggerFactory);

			expect(logger.debug).toBe(fakeLogger);

			expect(Debug).toHaveBeenCalledTimes(1);
			expect(Debug).toHaveBeenCalledWith("moleculer");
		});
	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a child logger", () => {
			const logger = new DebugLogger();
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.debug.extend).toHaveBeenCalledTimes(1);
			expect(logger.debug.extend).toHaveBeenCalledWith("my-service");

			logHandler("warn", ["message", { a: 5 }]);
			expect(childFakeLogger).toHaveBeenCalledTimes(1);
			expect(childFakeLogger).toHaveBeenCalledWith("message", { a: 5 });

			// should not call if level is lower
			childFakeLogger.mockClear();
			logHandler("debug", ["message", { a: 5 }]);
			expect(childFakeLogger).toHaveBeenCalledTimes(0);
		});

		it("should call the createLogger function", () => {
			fakeLogger.extend.mockClear();
			childFakeLogger.mockClear();

			const mockFn = jest.fn(() => childFakeLogger);
			const logger = new DebugLogger({
				createLogger: mockFn
			});
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.debug.extend).toHaveBeenCalledTimes(0);
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenCalledWith("info", {
				mod: "my-service",
				nodeID: "node-1"
			});

			logHandler("warn", ["message", { a: 5 }]);
			expect(childFakeLogger).toHaveBeenCalledTimes(1);
			expect(childFakeLogger).toHaveBeenCalledWith("message", { a: 5 });
		});

		it("should not create child logger if level is null", () => {
			fakeLogger.extend.mockClear();
			childFakeLogger.mockClear();

			const logger = new DebugLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(1);
			expect(logger.getLogLevel).toHaveBeenCalledWith("my-service");
		});

		it("should not create child logger if bindings is null", () => {
			fakeLogger.extend.mockClear();
			childFakeLogger.mockClear();

			const logger = new DebugLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(1);
			expect(logger.getLogLevel).toHaveBeenCalledWith(null);
		});
	});
});
