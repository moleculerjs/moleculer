"use strict";

const kleur = require("kleur");
const util = require("util");
kleur.enabled = false;

const ServiceBroker = require("../../src/service-broker");
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
		let broker = new ServiceBroker({ logger: false });

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

		let logger = createDefaultLogger(broker, con, bindings, "trace");
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
		let broker = new ServiceBroker({ logger: false });

		let con = {
			info: jest.fn()
		};

		let bindings = {
			mod: "v2.posts",
			svc: "posts",
			ver: 2,
			nodeID: "server-2",
			ns: ""
		};

		let logger = createDefaultLogger(broker, con, bindings, "info");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);

		expect(con.info).toHaveBeenCalledTimes(4);
		expect(con.info).toHaveBeenCalledWith("[1970-01-01T00:00:00.000Z]", "INFO ", "server-2/V2.POSTS:", "info level");
	});

	it("should create a logger with simple log formatter", () => {
		let broker = new ServiceBroker({ logger: false, logFormatter: "simple" });

		let con = {
			info: jest.fn()
		};

		let bindings = {
			mod: "broker",
			nodeID: "server-2",
			ns: ""
		};

		let logger = createDefaultLogger(broker, con, bindings, "info");
		callLogMethods(logger);
		expect(con.info).toHaveBeenCalledTimes(4);
		expect(con.info).toHaveBeenCalledWith("INFO ", "-", "info level");
	});

	it("should create a logger with short log formatter", () => {
		let broker = new ServiceBroker({ logger: false, logFormatter: "short" });

		let con = {
			info: jest.fn()
		};

		let bindings = {
			mod: "broker",
			nodeID: "server-2",
			ns: ""
		};

		let logger = createDefaultLogger(broker, con, bindings, "info");
		callLogMethods(logger);
		expect(con.info).toHaveBeenCalledTimes(4);
		expect(con.info).toHaveBeenCalledWith("[00:00:00.000Z]", "INFO ", "BROKER:", "info level");
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
		let broker = new ServiceBroker({ logger: false, logFormatter });

		let logger = createDefaultLogger(broker, con, bindings, "info");

		logger.info("info level");

		expect(logFormatter).toHaveBeenCalledTimes(1);
		expect(logFormatter).toHaveBeenCalledWith("info", ["info level"], { "nodeID": "server-2", "ns": "", "svc": "posts", "ver": 2 });
	});

	it("should create a filtered-level logger (module error)", () => {
		let broker = new ServiceBroker({ logger: false });
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn(),
		};
		let logger = createDefaultLogger(broker, con, {
			mod: "CTX"
		}, {
			"*": "debug",
			"CTX": "error"
		});

		callLogMethods(logger);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(0);
		expect(con.warn).toHaveBeenCalledTimes(0);
		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.fatal).toHaveBeenCalledTimes(1);
	});

	it("should create a filtered-level logger ('*' info)", () => {
		let broker = new ServiceBroker({ logger: false });
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn(),
		};
		let logger = createDefaultLogger(broker, con, {
			mod: "OTHER"
		}, {
			"*": "info",
			"CTX": "error"
		});

		callLogMethods(logger);
		expect(con.trace).toHaveBeenCalledTimes(0);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.fatal).toHaveBeenCalledTimes(1);
	});

	it("should create an empty logger (false with wildcard)", () => {
		let broker = new ServiceBroker({ logger: false });
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn()
		};
		let logger = createDefaultLogger(broker, con, {
			mod: "SVC.POSTS.OTHER"
		}, {
			"SVC.**": false,
			"**": "info",
		});

		callLogMethods(logger);
		expect(con.trace).toHaveBeenCalledTimes(0);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(0);
		expect(con.warn).toHaveBeenCalledTimes(0);
		expect(con.error).toHaveBeenCalledTimes(0);
		expect(con.fatal).toHaveBeenCalledTimes(0);
	});

	it("should use default logObjectPrinter", () => {
		let broker = new ServiceBroker({ logger: false });
		let con = {
			info: jest.fn()
		};

		let bindings = {
			mod: "v2.posts",
			svc: "posts",
			ver: 2,
			nodeID: "server-2",
			ns: ""
		};

		let logger = createDefaultLogger(broker, con, bindings, "info");
		const obj = { a: "a".repeat(20), b: "b".repeat(20), c: "c".repeat(20) };

		logger.info("with object", obj);

		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.info).toHaveBeenCalledWith(
			"[1970-01-01T00:00:00.000Z]",
			"INFO ",
			"server-2/V2.POSTS:",
			"with object",
			"{ a: 'aaaaaaaaaaaaaaaaaaaa', b: 'bbbbbbbbbbbbbbbbbbbb', c: 'cccccccccccccccccccc' }"
		);
	});

	if (process.versions.node.split(".")[0] < 10) {
		// Skip it on Node 10, because the util.inspect gives different output
		it("should use custom logObjectPrinter", () => {
			let con = {
				info: jest.fn()
			};

			let bindings = {
				mod: "v2.posts",
				svc: "posts",
				ver: 2,
				nodeID: "server-2",
				ns: ""
			};

			let logObjectPrinter =  o => util.inspect(o, { depth: 4, colors: false, breakLength: 5 });
			let broker = new ServiceBroker({ logger: false, logObjectPrinter });

			let logger = createDefaultLogger(broker, con, bindings, "info");
			const obj = { a: "a".repeat(20), b: "b".repeat(20), c: "c".repeat(20) };

			logger.info("with object", obj);

			expect(con.info).toHaveBeenCalledTimes(1);
			expect(con.info).toHaveBeenCalledWith(
				"[1970-01-01T00:00:00.000Z]",
				"INFO ",
				"server-2/V2.POSTS:",
				"with object",
				"{ a: 'aaaaaaaaaaaaaaaaaaaa',\n  b: 'bbbbbbbbbbbbbbbbbbbb',\n  c: 'cccccccccccccccccccc' }"
			);
		});
	}
});
