"use strict";

jest.mock("bunyan");

const Bunyan = require("bunyan");

const childFakeLogger = { warn: jest.fn() };
const fakeLogger = {
	child: jest.fn(() => childFakeLogger)
};
Bunyan.createLogger = jest.fn().mockImplementation(() => fakeLogger);

const BunyanLogger = require("../../../src/loggers/bunyan");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const broker = new ServiceBroker({ logger: false });

describe("Test Bunyan logger class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const logger = new BunyanLogger();

			expect(logger.opts).toEqual({
				bunyan: {
					name: "moleculer"
				},
				createLogger: null,
				level: "info"
			});
		});

		it("should create with custom options", () => {
			const logger = new BunyanLogger({
				bunyan: {
					name: "my-app"
				},
				createLogger: jest.fn(),
				level: "debug"
			});

			expect(logger.opts).toEqual({
				bunyan: {
					name: "my-app"
				},
				createLogger: expect.any(Function),
				level: "debug"
			});
		});
	});

	describe("Test init method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a default logger", () => {
			const logger = new BunyanLogger();

			logger.init(loggerFactory);

			expect(logger.bunyan).toBe(fakeLogger);

			expect(Bunyan.createLogger).toHaveBeenCalledTimes(1);
			expect(Bunyan.createLogger).toHaveBeenCalledWith({
				name: "moleculer"
			});
		});

		it("should create a default logger with custom options", () => {
			Bunyan.createLogger.mockClear();
			const logger = new BunyanLogger({
				a: 5,
				bunyan: {
					name: "my-app"
				}
			});

			logger.init(loggerFactory);

			expect(logger.bunyan).toBe(fakeLogger);

			expect(Bunyan.createLogger).toHaveBeenCalledTimes(1);
			expect(Bunyan.createLogger).toHaveBeenCalledWith({
				name: "my-app"
			});
		});
	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a child logger", () => {
			const logger = new BunyanLogger();
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.bunyan.child).toHaveBeenCalledTimes(1);
			expect(logger.bunyan.child).toHaveBeenCalledWith({
				level: "info",
				mod: "my-service",
				nodeID: "node-1"
			});

			logHandler("warn", ["message", { a: 5 }]);
			expect(childFakeLogger.warn).toHaveBeenCalledTimes(1);
			expect(childFakeLogger.warn).toHaveBeenCalledWith("message", { a: 5 });
		});

		it("should call the createLogger function", () => {
			fakeLogger.child.mockClear();
			childFakeLogger.warn.mockClear();

			const mockFn = jest.fn(() => childFakeLogger);
			const logger = new BunyanLogger({
				createLogger: mockFn
			});
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.bunyan.child).toHaveBeenCalledTimes(0);
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

			const logger = new BunyanLogger();
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

			const logger = new BunyanLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(0);
		});
	});
});
