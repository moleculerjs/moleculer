const { wrap } = require("../../src/logger");

function callLogMethods(logger) {
	logger.trace("trace level");
	logger.debug("debug level");
	logger.info("info level");
	logger.warn("warn level");
	logger.error("error level");	
	logger.fatal("fatal level");
}

// Unit: OK!
describe("Test wrap", () => {

	it("should create a full logger without moduleName", () => {
		let con = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		
		let logger = wrap(con, null, "trace");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);
		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("warn level");

		expect(con.error).toHaveBeenCalledTimes(2);
		expect(con.error).toHaveBeenCalledWith("error level");
		expect(con.error).toHaveBeenCalledWith("fatal level");

		expect(con.info).toHaveBeenCalledTimes(3);
		expect(con.info).toHaveBeenCalledWith("debug level");
		expect(con.info).toHaveBeenCalledWith("info level");
		expect(con.info).toHaveBeenCalledWith("trace level");
	});

	it("should create a full logger with missing methods", () => {
		let con = {
			info: jest.fn(),
			error: jest.fn(),
		};
		
		let logger = wrap(con, null, "trace");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);

		expect(con.error).toHaveBeenCalledTimes(3);
		expect(con.error).toHaveBeenCalledWith("error level");
		expect(con.error).toHaveBeenCalledWith("warn level");
		expect(con.error).toHaveBeenCalledWith("fatal level");

		expect(con.info).toHaveBeenCalledTimes(3);
		expect(con.info).toHaveBeenCalledWith("debug level");
		expect(con.info).toHaveBeenCalledWith("info level");
		expect(con.info).toHaveBeenCalledWith("trace level");
	});	

	it("should create a full logger with moduleName", () => {
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn()
		};
		let logger = wrap(con, "Module", "trace");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);

		expect(con.fatal).toHaveBeenCalledTimes(1);
		expect(con.fatal).toHaveBeenCalledWith("[Module] fatal level");

		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("[Module] error level");

		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("[Module] warn level");

		expect(con.info).toHaveBeenCalledTimes(1);
		expect(con.info).toHaveBeenCalledWith("[Module] info level");

		expect(con.debug).toHaveBeenCalledTimes(1);
		expect(con.debug).toHaveBeenCalledWith("[Module] debug level");

		expect(con.trace).toHaveBeenCalledTimes(1);
		expect(con.trace).toHaveBeenCalledWith("[Module] trace level");
	});
});

describe("Test wrap with logLevels", () => {

	it("should create a filtered-level logger (warn)", () => {
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn()
		};
		let logger = wrap(con, "Module", "warn");
		expect(logger.fatal).toBeInstanceOf(Function);
		expect(logger.error).toBeInstanceOf(Function);
		expect(logger.warn).toBeInstanceOf(Function);
		expect(logger.info).toBeInstanceOf(Function);
		expect(logger.debug).toBeInstanceOf(Function);
		expect(logger.trace).toBeInstanceOf(Function);

		callLogMethods(logger);
		expect(con.trace).toHaveBeenCalledTimes(0);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(0);

		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("[Module] warn level");
		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("[Module] error level");
		expect(con.fatal).toHaveBeenCalledTimes(1);
		expect(con.fatal).toHaveBeenCalledWith("[Module] fatal level");
	});	

	it("should create a filtered-level logger (module error)", () => {
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn(),
		};
		let logger = wrap(con, "CTX", {
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
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn(),
		};
		let logger = wrap(con, "SVC", {
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

	it("should create an empty logger (false)", () => {
		let con = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			fatal: jest.fn()
		};
		let logger = wrap(con, "SVC", {
			"*": "info",
			"SVC": false
		});

		callLogMethods(logger);
		expect(con.trace).toHaveBeenCalledTimes(0);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(0);
		expect(con.warn).toHaveBeenCalledTimes(0);
		expect(con.error).toHaveBeenCalledTimes(0);
		expect(con.fatal).toHaveBeenCalledTimes(0);
	});		

});