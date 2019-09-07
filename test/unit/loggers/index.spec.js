const { BrokerOptionsError } = require("../../../src/errors");
const Loggers = require("../../../src/loggers");

class MyLogger extends Loggers.Base {
	constructor(opts) {
		super(opts);
	}
}

process.env.DATADOG_API_KEY = "datadog-api-key";

describe("Test Loggers resolver", () => {

	it("should throw error", () => {
		expect(() => Loggers.resolve()).toThrowError(BrokerOptionsError);
		expect(() => Loggers.resolve({})).toThrowError(BrokerOptionsError);
		expect(() => Loggers.resolve("xyz")).toThrowError(BrokerOptionsError);
		expect(() => Loggers.resolve({ type: "xyz" })).toThrowError(BrokerOptionsError);
	});

	it("should resolve Bunyan logger from string", () => {
		let logger = Loggers.resolve("Bunyan");
		expect(logger).toBeInstanceOf(Loggers.Bunyan);
	});

	it("should resolve Bunyan logger from obj", () => {
		let options = { bunyan: { a: 5 } };
		let logger = Loggers.resolve({ type: "Bunyan", options });
		expect(logger).toBeInstanceOf(Loggers.Bunyan);
		expect(logger.opts).toEqual(expect.objectContaining({ bunyan: { a: 5, name: "moleculer" } }));
	});

	it("should resolve console logger from string", () => {
		let logger = Loggers.resolve("Console");
		expect(logger).toBeInstanceOf(Loggers.Console);
	});

	it("should resolve console logger from obj", () => {
		let options = { moduleColors: true };
		let logger = Loggers.resolve({ type: "Console", options });
		expect(logger).toBeInstanceOf(Loggers.Console);
		expect(logger.opts).toEqual(expect.objectContaining({ moduleColors: true }));
	});

	it("should resolve Datadog logger from string", () => {
		let logger = Loggers.resolve("Datadog");
		expect(logger).toBeInstanceOf(Loggers.Datadog);
	});

	it("should resolve Datadog logger from obj", () => {
		let options = { a: 5 };
		let logger = Loggers.resolve({ type: "Datadog", options });
		expect(logger).toBeInstanceOf(Loggers.Datadog);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

	it("should resolve Debug logger from string", () => {
		let logger = Loggers.resolve("Debug");
		expect(logger).toBeInstanceOf(Loggers.Debug);
	});

	it("should resolve Debug logger from obj", () => {
		let options = { a: 5 };
		let logger = Loggers.resolve({ type: "Debug", options });
		expect(logger).toBeInstanceOf(Loggers.Debug);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

	it("should resolve File logger from string", () => {
		let logger = Loggers.resolve("File");
		expect(logger).toBeInstanceOf(Loggers.File);
	});

	it("should resolve File logger from obj", () => {
		let options = { a: 5 };
		let logger = Loggers.resolve({ type: "File", options });
		expect(logger).toBeInstanceOf(Loggers.File);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

	it("should resolve Log4js logger from string", () => {
		let logger = Loggers.resolve("Log4js");
		expect(logger).toBeInstanceOf(Loggers.Log4js);
	});

	it("should resolve Log4js logger from obj", () => {
		let options = { a: 5 };
		let logger = Loggers.resolve({ type: "Log4js", options });
		expect(logger).toBeInstanceOf(Loggers.Log4js);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

	it("should resolve Pino logger from string", () => {
		let logger = Loggers.resolve("Pino");
		expect(logger).toBeInstanceOf(Loggers.Pino);
	});

	it("should resolve Pino logger from obj", () => {
		let options = { a: 5 };
		let logger = Loggers.resolve({ type: "Pino", options });
		expect(logger).toBeInstanceOf(Loggers.Pino);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

	it("should resolve Winston logger from string", () => {
		let logger = Loggers.resolve("Winston");
		expect(logger).toBeInstanceOf(Loggers.Winston);
	});

	it("should resolve Winston logger from obj", () => {
		let options = { a: 5 };
		let logger = Loggers.resolve({ type: "Winston", options });
		expect(logger).toBeInstanceOf(Loggers.Winston);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

	it("should resolve custom logger", () => {
		let logger = Loggers.resolve(new MyLogger({ a: 5 }));
		expect(logger).toBeInstanceOf(Loggers.Base);
		expect(logger.opts).toEqual(expect.objectContaining({ a: 5 }));
	});

});
