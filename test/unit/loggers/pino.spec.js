"use strict";

jest.mock("pino");

const Pino = require("pino");

const childFakeLogger = { warn: jest.fn() };
const fakeLogger = {
	child: jest.fn(() => childFakeLogger)
};
Pino.mockImplementation(() => fakeLogger);

const PinoLogger = require("../../../src/loggers/pino");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const broker = new ServiceBroker({ logger: false });

describe("Test Pino logger class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const logger = new PinoLogger();

			expect(logger.opts).toEqual({
				pino: {
					options: null,
					destination: null
				},
				createLogger: null,
				level: "info"
			});
		});

		it("should create with custom options", () => {
			const logger = new PinoLogger({
				pino: {
					options: { a: 5 },
					destination: "/logs"
				},
				createLogger: jest.fn(),
				level: "debug"
			});

			expect(logger.opts).toEqual({
				pino: {
					options: { a: 5 },
					destination: "/logs"
				},
				createLogger: expect.any(Function),
				level: "debug"
			});
		});

	});

	describe("Test init method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a default logger", () => {
			const logger = new PinoLogger();

			logger.init(loggerFactory);

			expect(logger.pino).toBe(fakeLogger);

			expect(Pino).toHaveBeenCalledTimes(1);
			expect(Pino).toHaveBeenCalledWith(undefined, undefined);
		});

		it("should create a default logger with custom options", () => {
			Pino.mockClear();
			const logger = new PinoLogger({
				pino: {
					options: { a: 5 },
					destination: "/logs"
				},
			});

			logger.init(loggerFactory);

			expect(logger.pino).toBe(fakeLogger);

			expect(Pino).toHaveBeenCalledTimes(1);
			expect(Pino).toHaveBeenCalledWith({ a: 5 }, "/logs");
		});

	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a child logger", () => {
			const logger = new PinoLogger();
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.pino.child).toHaveBeenCalledTimes(1);
			expect(logger.pino.child).toHaveBeenCalledWith({
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
			const logger = new PinoLogger({
				createLogger: mockFn
			});
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);
			expect(logger.pino.child).toHaveBeenCalledTimes(0);
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

			const logger = new PinoLogger();
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

			const logger = new PinoLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(0);
		});

	});

});
