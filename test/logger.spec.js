const { wrap } = require("../src/logger");

function callLogMethods(logger) {
	logger.log("log level");
	logger.info("info level");
	logger.debug("debug level");
	logger.warn("warn level");
	logger.error("error level");	
}

describe("Test wrap", () => {

	it("should create a full logger without moduleName", () => {
		let con = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		
		let logger = wrap(con, null, "debug");
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.debug).toBe("function");

		callLogMethods(logger);
		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("warn level");

		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("error level");

		expect(con.info).toHaveBeenCalledTimes(3);
		expect(con.info).toHaveBeenCalledWith("debug level");
		expect(con.info).toHaveBeenCalledWith("info level");
		expect(con.info).toHaveBeenCalledWith("log level");
	});

	it("should create a full logger with moduleName", () => {
		let con = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		let logger = wrap(con, "Module", "debug");
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.debug).toBe("function");

		callLogMethods(logger);

		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("[Module] warn level");

		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("[Module] error level");

		expect(con.info).toHaveBeenCalledTimes(3);
		expect(con.info).toHaveBeenCalledWith("[Module] info level");
		expect(con.info).toHaveBeenCalledWith("[Module] log level");
		expect(con.info).toHaveBeenCalledWith("[Module] debug level");
	});
});

describe("Test wrap with logLevels", () => {

	it("should create a filtered-level logger (warn)", () => {
		let con = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		let logger = wrap(con, "Module", "warn");
		expect(typeof logger.log).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.warn).toBe("function");
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.debug).toBe("function");

		callLogMethods(logger);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(0);

		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.warn).toHaveBeenCalledWith("[Module] warn level");
		expect(con.error).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledWith("[Module] error level");
	});	

	it("should create a filtered-level logger (module error)", () => {
		let con = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
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
	});		

	it("should create a filtered-level logger ('*' info)", () => {
		let con = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		let logger = wrap(con, "SVC", {
			"*": "info",
			"CTX": "error"
		});

		callLogMethods(logger);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(2);
		expect(con.warn).toHaveBeenCalledTimes(1);
		expect(con.error).toHaveBeenCalledTimes(1);
	});		

	it("should create an empty logger (false)", () => {
		let con = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		let logger = wrap(con, "SVC", {
			"*": "info",
			"SVC": false
		});

		callLogMethods(logger);
		expect(con.debug).toHaveBeenCalledTimes(0);
		expect(con.info).toHaveBeenCalledTimes(0);
		expect(con.warn).toHaveBeenCalledTimes(0);
		expect(con.error).toHaveBeenCalledTimes(0);
	});		

});