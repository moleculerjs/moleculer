"use strict";

const utils = require("../../../src/utils");
utils.makeDirs = jest.fn();

jest.mock("path");
jest.mock("fs");

const path = require("path");
const fs = require("fs");

path.join = jest.fn((...args) => args.join("/"));
path.resolve = jest.fn((...args) => args.join("/"));

const os = require("os");
const FileLogger = require("../../../src/loggers/file");
const ServiceBroker = require("../../../src/service-broker");
const LoggerFactory = require("../../../src/logger-factory");

const lolex = require("lolex");

const broker = new ServiceBroker({ logger: false, nodeID: "node-123", namespace: "test-ns" });

describe("Test File logger class", () => {

	describe("Test Constructor", () => {

		it("should create with default options", () => {
			const logger = new FileLogger();

			expect(logger.opts).toEqual({
				createLogger: null,
				level: "info",
				folder: "./logs",
				filename: "moleculer-{date}.log",
				format: "json",
				eol: os.EOL,
				interval: 1 * 1000
			});

			expect(logger.queue).toEqual([]);
			expect(logger.currentFilename).toBeNull();
			expect(logger.fs).toBeNull();
		});

		it("should create with custom options", () => {
			const logger = new FileLogger({
				createLogger: jest.fn(),
				level: "debug",
				folder: "/my-log",
				filename: "moleculer-{ns}-{date}.json",
				format: "json",
				eol: "/",
				interval: 5 * 1000
			});

			expect(logger.opts).toEqual({
				createLogger: expect.any(Function),
				level: "debug",
				folder: "/my-log",
				filename: "moleculer-{ns}-{date}.json",
				format: "json",
				eol: "/",
				interval: 5 * 1000
			});
		});

	});

	describe("Test init method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should init the logger", () => {
			const logger = new FileLogger();

			logger.init(loggerFactory);

			expect(logger.logFolder).toBe("./logs");
			expect(logger.timer).toBeDefined();
		});

		it("should init the logger with custom options", () => {
			utils.makeDirs.mockClear();

			const logger = new FileLogger({
				folder: "/logs/{namespace}/{nodeID}",
				interval: 0
			});

			logger.init(loggerFactory);

			expect(logger.logFolder).toBe("/logs/test-ns/node-123");
			expect(logger.timer).toBeNull();

			expect(utils.makeDirs).toHaveBeenCalledTimes(1);
			expect(utils.makeDirs).toHaveBeenCalledWith("/logs/test-ns/node-123");
		});

		it("should use custom objectPrinter", () => {
			const objectPrinter = jest.fn();
			const logger = new FileLogger({
				objectPrinter
			});

			logger.init(loggerFactory);

			expect(logger.objectPrinter).toBe(objectPrinter);
		});

	});

	describe("Test render method", () => {
		const loggerFactory = new LoggerFactory(broker);

		it("should return interpolated string", () => {
			const logger = new FileLogger();

			logger.init(loggerFactory);

			expect(logger.render("/logs/test")).toBe("/logs/test");
			expect(logger.render("/logs-{namespace}/{nodeID}-{namespace}", {
				namespace: "test-ns",
				nodeID: "server-1"
			})).toBe("/logs-test-ns/server-1-test-ns");

		});
	});

	describe("Test getFilename method", () => {
		const loggerFactory = new LoggerFactory(broker);

		let clock;

		beforeAll(() => {
			clock = lolex.install();
		});

		afterAll(() => {
			clock.uninstall();
		});

		it("should return interpolated filename", () => {
			const logger = new FileLogger();

			logger.init(loggerFactory);

			expect(logger.getFilename()).toBe("./logs/moleculer-1970-01-01.log");
		});
	});

	describe("Test getLogHandler method", () => {
		const loggerFactory = new LoggerFactory(broker);
		let clock;

		beforeAll(() => {
			clock = lolex.install();
		});

		afterAll(() => {
			clock.uninstall();
		});

		it("should create a child logger", () => {
			const logger = new FileLogger({ level: "trace" });
			logger.init(loggerFactory);
			logger.flush = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);

			logHandler("fatal", ["message", { a: 5 }]);
			logHandler("error", ["message", { a: 5 }]);
			logHandler("warn", ["message", { a: 5 }]);
			logHandler("info", ["message", { a: 5 }]);
			logHandler("debug", ["message", { a: 5 }]);
			logHandler("trace", ["message", { a: 5 }]);

			expect(logger.queue).toEqual([
				{ "level": "fatal", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "error", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "warn", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "info", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "debug", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "trace", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 }
			]);

			expect(logger.flush).toHaveBeenCalledTimes(0);
		});

		it("should not call console if level is lower", () => {
			const logger = new FileLogger({ level: "info" });
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);

			logHandler("fatal", ["message", { a: 5 }]);
			logHandler("error", ["message", { a: 5 }]);
			logHandler("warn", ["message", { a: 5 }]);
			logHandler("info", ["message", { a: 5 }]);
			logHandler("debug", ["message", { a: 5 }]);
			logHandler("trace", ["message", { a: 5 }]);

			expect(logger.queue).toEqual([
				{ "level": "fatal", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "error", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "warn", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "info", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
			]);
		});

		it("should not create child logger if level is null", () => {
			const logger = new FileLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(1);
			expect(logger.getLogLevel).toHaveBeenCalledWith("my-service");
		});

		it("should not create child logger if bindings is null", () => {
			const logger = new FileLogger();
			logger.init(loggerFactory);

			logger.getLogLevel = jest.fn();

			const logHandler = logger.getLogHandler();
			expect(logHandler).toBeNull();
			expect(logger.getLogLevel).toHaveBeenCalledTimes(0);
		});

		it("should call flush if not interval", () => {
			const logger = new FileLogger({ level: "trace", interval: 0 });
			logger.init(loggerFactory);
			logger.flush = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			expect(logHandler).toBeInstanceOf(Function);

			logHandler("fatal", ["message", { a: 5 }]);
			logHandler("error", ["message", { a: 5 }]);

			expect(logger.queue).toEqual([
				{ "level": "fatal", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
				{ "level": "error", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 },
			]);

			expect(logger.flush).toHaveBeenCalledTimes(2);
		});

	});

	describe("Test flush method", () => {
		const loggerFactory = new LoggerFactory(broker);

		let clock;

		beforeAll(() => {
			clock = lolex.install();
		});

		afterAll(() => {
			clock.uninstall();
		});

		it("should do nothing if queue is empty", () => {
			const logger = new FileLogger({ level: "trace", interval: 0 });
			logger.init(loggerFactory);

			logger.renderRow = jest.fn();
			fs.appendFile.mockClear();

			logger.flush();

			expect(logger.renderRow).toHaveBeenCalledTimes(0);
			expect(fs.appendFile).toHaveBeenCalledTimes(0);
		});

		it("should render rows and call appendFile", () => {
			const logger = new FileLogger({ level: "trace", eol: "\n" });
			logger.init(loggerFactory);

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			logHandler("fatal", ["message", { a: 5 }]);
			logHandler("error", ["message", { a: 5 }]);

			logger.renderRow = jest.fn(() => "rendered");
			fs.appendFile.mockClear();

			logger.flush();

			expect(logger.renderRow).toHaveBeenCalledTimes(2);
			expect(logger.renderRow).toHaveBeenNthCalledWith(1, { "level": "fatal", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 });
			expect(logger.renderRow).toHaveBeenNthCalledWith(2, { "level": "error", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 });

			expect(fs.appendFile).toHaveBeenCalledTimes(1);
			expect(fs.appendFile).toHaveBeenCalledWith("./logs/moleculer-1970-01-01.log", "rendered\nrendered\n", expect.any(Function));
		});

		it("should call flush after interval", () => {
			const logger = new FileLogger({ level: "trace", interval: 2000 });
			logger.init(loggerFactory);
			logger.flush = jest.fn();

			const logHandler = logger.getLogHandler({ mod: "my-service", nodeID: "node-1" });
			logHandler("fatal", ["message", { a: 5 }]);
			logHandler("error", ["message", { a: 5 }]);

			expect(logger.flush).toHaveBeenCalledTimes(0);

			clock.tick(2100);

			expect(logger.flush).toHaveBeenCalledTimes(1);
		});

	});

	describe("Test renderRow method", () => {
		const loggerFactory = new LoggerFactory(broker);

		let clock;

		beforeAll(() => {
			clock = lolex.install();
		});

		afterAll(() => {
			clock.uninstall();
		});

		it("should render row to JSON", () => {
			const logger = new FileLogger({ level: "trace", format: "json" });
			logger.init(loggerFactory);

			const json = logger.renderRow({ "level": "fatal", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 });
			expect(json).toBe("{\"level\":\"fatal\",\"mod\":\"my-service\",\"msg\":\"message { a: 5 }\",\"nodeID\":\"node-1\",\"ts\":0}");
		});

		it("should render row to custom string", () => {
			const logger = new FileLogger({ level: "trace", format: "{timestamp} {level} {nodeID}/{mod}: {msg}" });
			logger.init(loggerFactory);

			const str = logger.renderRow({ "level": "fatal", "mod": "my-service", "msg": "message { a: 5 }", "nodeID": "node-1", "ts": 0 });
			expect(str).toBe("1970-01-01T00:00:00.000Z fatal node-1/my-service: message { a: 5 }");
		});

	});

});
