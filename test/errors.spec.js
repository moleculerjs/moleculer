"use strict";

let errors = require("../src/errors");

describe("Test Errors", () => {

	it("test error types", () => {
		expect(errors.ServiceNotFoundError).toBeDefined();
	});

	it("test ServiceNotFoundError", () => {
		let data = {};
		let err = new errors.ServiceNotFoundError("Something went wrong!", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("ServiceNotFoundError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.data).toBe(data);
	});

	it("test RequestTimeoutError", () => {
		let data = {};
		let err = new errors.RequestTimeoutError("Something went wrong!", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("RequestTimeoutError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.data).toBe(data);
	});

	it("test ValidationError", () => {
		let data = {};
		let err = new errors.ValidationError("Param is not correct!", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("ValidationError");
		expect(err.message).toBe("Param is not correct!");
		expect(err.data).toBe(data);
	});

});