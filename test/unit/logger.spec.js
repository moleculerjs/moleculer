"use strict";

const chalk = require("chalk");
const util = require("util");
chalk.enabled = false;

const { extend, createDefaultLogger } = require("../../src/logger");
const lolex = require("lolex");

function callLogMethods(logger) {
	logger.trace("trace level");
	logger.debug("debug level");
	logger.info("info level");
	logger.warn("warn level");
	logger.error("error level");
	logger.fatal("fatal level");
}

describe("Test extend", () => {

	it("should extend to full logger", () => {
		let con = {
			info: jest.fn(),
			warn: jest.fn()
		};

		let logger = extend(con);
		expect(logger.fatal).toBeDefined();
		expect(logger.error).toBeDefined();
		expect(logger.warn).toBeDefined();
		expect(logger.info).toBeDefined();
		expect(logger.debug).toBeDefined();
		expect(logger.trace).toBeDefined();

		callLogMethods(logger);

		expect(con.info).toHaveBeenCalledTimes(5);
		expect(con.info).toHaveBeenCalledWith("fatal level");
		expect(con.info).toHaveBeenCalledWith("error level");
		expect(con.info).toHaveBeenCalledWith("debug level");
		expect(con.info).toHaveBeenCalledWith("info level");
		expect(con.info).toHaveBeenCalledWith("trace level");

		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("warn level");
	});

});


describe("Test createDefaultLogger", () => {

	let clock;

	beforeAll(() => {
		clock = lolex.install();
	});

	afterAll(() => {
		clock.uninstall();
	});

	it("should create a full logger with moduleName", () => {
		let con = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		let bindings = {
			mod: "broker",
			nodeID: "server-2",
			ns: "testing"
		};

		let logger = createDefaultLogger(con, bindings, "trace");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);

		expect(con.error).toHaveBeenCalledTimes(2);
		expect(con.error).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "FATAL", "server-2/BROKER:", "fatal level");
		expect(con.error).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "ERROR", "server-2/BROKER:", "error level");

		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "WARN ", "server-2/BROKER:", "warn level");

		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.info).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "INFO ", "server-2/BROKER:", "info level");

		expect(con.debug).toHaveBeenCalledTimes(2);
		expect(con.debug).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "DEBUG", "server-2/BROKER:", "debug level");
		expect(con.debug).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "TRACE", "server-2/BROKER:", "trace level");
	});

	it("should create a full logger with versioned service name", () => {
		let con = {
			info: jest.fn()
		};

		let bindings = {
			svc: "posts",
			ver: 2,
			nodeID: "server-2",
			ns: ""
		};

		let logger = createDefaultLogger(con, bindings, "info");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);

		expect(con.info).toHaveBeenCalledTimes(4);
		expect(con.info).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "INFO ", "server-2/POSTS:v2:", "info level");
	});

	it("should create a full logger with logFormatter", () => {
		let con = {
			info: jest.fn()
		};

		let bindings = {
			svc: "posts",
			ver: 2,
			nodeID: "server-2",
			ns: ""
		};

		let logFormatter = jest.fn();

		let logger = createDefaultLogger(con, bindings, "info", logFormatter);

		logger.info("info level");

		expect(logFormatter).toHaveBeenCalledTimes(1);
		expect(logFormatter).toHaveBeenCalledWith("info", ["info level"], {"nodeID": "server-2", "ns": "", "svc": "posts", "ver": 2});
	});

	it("should use default logObjectPrinter", () => {
		let con = {
			info: jest.fn()
		};

		let bindings = {
			svc: "posts",
			ver: 2,
			nodeID: "server-2",
			ns: ""
		};

		let logObjectPrinter =  o => util.inspect(o, { depth: 4, colors: false, breakLength: 5 })
		let logger = createDefaultLogger(con, bindings, "info", undefined, logObjectPrinter);
		const obj = {a: "a".repeat(20), b: "b".repeat(20), c: "c".repeat(20)}

		logger.info("with object", obj);

		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.info).toHaveBeenCalledWith(
			"[1970-01-01T00:00:00.000Z]",
			"INFO ",
			"server-2/POSTS:v2:",
			"with object",
			"{ a: 'aaaaaaaaaaaaaaaaaaaa',\n  b: 'bbbbbbbbbbbbbbbbbbbb',\n  c: 'cccccccccccccccccccc' }"
		);
	});

	it("should use custom logObjectPrinter", () => {
		let con = {
			info: jest.fn()
		};

		let bindings = {
			svc: "posts",
			ver: 2,
			nodeID: "server-2",
			ns: ""
		};

		let logger = createDefaultLogger(con, bindings, "info");
		const obj = {a: "a".repeat(20), b: "b".repeat(20), c: "c".repeat(20)}

		logger.info("with object", obj);

		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.info).toHaveBeenCalledWith(
			"[1970-01-01T00:00:00.000Z]",
			"INFO ",
			"server-2/POSTS:v2:",
			"with object",
			"{ a: 'aaaaaaaaaaaaaaaaaaaa', b: 'bbbbbbbbbbbbbbbbbbbb', c: 'cccccccccccccccccccc' }"
		);
	});
});
