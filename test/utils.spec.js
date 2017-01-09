const utils = require("../src/utils");

describe("Test utils", () => {

	it("utils.generateToken", () => {
		let res1 = utils.generateToken();
		expect(res1).toBeDefined();

		let res2 = utils.generateToken();
		expect(res2).toBeDefined();
		expect(res1).not.toEqual(res2);
	});


	it("utils.isPromise", () => {
		expect(utils.isPromise()).toBeFalsy();
		expect(utils.isPromise({})).toBeFalsy();
		expect(utils.isPromise(new Promise(() => {}))).toBeTruthy();
		expect(utils.isPromise(Promise.resolve())).toBeTruthy();
		//expect(utils.isPromise(Promise.reject())).toBeTruthy(); // node gives warning
	});
});

describe("Test utils.getNodeID", () => {
	let os = require("os");
	it("should give the computer hostname", () => {
		expect(utils.getNodeID()).toBe(os.hostname().toLowerCase());
	});
});

describe("Test utils.string2Json", () => {
	let str = '{"a": 1, "b": [1,5,8], "c": "Test" }';
	it("should give JS object", () => {
		expect(utils.string2Json()).toBeUndefined();
		expect(utils.string2Json("")).toBeUndefined();
		expect(utils.string2Json(str)).toEqual({
			a: 1, 
			b: [1,5,8],
			c: "Test"
		});
	});
});

describe("Test utils.json2String", () => {
	let str = '{"a":1,"b":[1,5,8],"c":"Test"}';
	let obj = {
		a: 1, 
		b: [1,5,8],
		c: "Test"
	};

	it("should give JSON string", () => {
		expect(utils.json2String()).toBe("");
		expect(utils.json2String(null)).toBe("");
		expect(utils.json2String(obj)).toBe(str);
	});
});

function callLogMethods(logger) {
	logger.log("log level");
	logger.info("info level");
	logger.debug("debug level");
	logger.warn("warn level");
	logger.error("error level");	
}

describe("Test utils.wrapLogger", () => {

	it("should create a full logger without moduleName", () => {
		let con = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		
		let logger = utils.wrapLogger(con, null, "debug");
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
		let logger = utils.wrapLogger(con, "Module", "debug");
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

describe("Test utils.wrapLogger with logLevels", () => {

	it("should create a filtered-level logger (warn)", () => {
		let con = {
			debug: jest.fn(),
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn()
		};
		let logger = utils.wrapLogger(con, "Module", "warn");
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
		let logger = utils.wrapLogger(con, "CTX", {
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
		let logger = utils.wrapLogger(con, "SVC", {
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
		let logger = utils.wrapLogger(con, "SVC", {
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