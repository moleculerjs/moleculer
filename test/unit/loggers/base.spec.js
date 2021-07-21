"use strict";

const BaseLogger = require("../../../src/loggers/base");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const broker = new ServiceBroker({ logger: false });

describe("Test Bunyan logger class", () => {
	describe("Test Constructor", () => {
		it("should create with default options", () => {
			const logger = new BaseLogger();

			expect(logger.opts).toEqual({
				level: "info",
				createLogger: null
			});
		});

		it("should create with custom options", () => {
			const logger = new BaseLogger({
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
			const logger = new BaseLogger();

			logger.init(loggerFactory);

			expect(logger.loggerFactory).toBe(loggerFactory);
			expect(logger.broker).toBe(broker);
		});
	});

	describe("Test stop method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should create a default logger", async () => {
			const logger = new BaseLogger();
			logger.init(loggerFactory);

			await logger.stop();
		});
	});

	describe("Test getLogLevel method", () => {
		it("should find the correct log level if logLevel is string", () => {
			const logger = new BaseLogger({
				level: "info"
			});

			expect(logger.getLogLevel()).toBe("info");
			expect(logger.getLogLevel("my-module")).toBe("info");
		});

		it("should find the correct log level if logLevel is object", () => {
			const logger = new BaseLogger({
				level: {
					"MY-*": "warn",
					CACHER: false,
					"**": "trace",
					BROKER: "debug"
				}
			});

			expect(logger.getLogLevel()).toBe("trace");
			expect(logger.getLogLevel("my-module")).toBe("warn");
			expect(logger.getLogLevel("MY-MODULE")).toBe("warn");
			expect(logger.getLogLevel("MY.SERVICE")).toBe("trace");
			expect(logger.getLogLevel("broker")).toBe("debug");
			expect(logger.getLogLevel("cacher")).toBe(false);
			expect(logger.getLogLevel("transporter")).toBe("trace");
		});
	});

	describe("Test getLogHandler abstract method", () => {
		it("should return null", () => {
			const logger = new BaseLogger({
				level: "info"
			});

			expect(logger.getLogHandler()).toBeNull();
		});
	});

	describe("Test LEVELS static property", () => {
		it("should contain log levels", () => {
			expect(BaseLogger.LEVELS).toEqual(["fatal", "error", "warn", "info", "debug", "trace"]);
		});
	});
});
