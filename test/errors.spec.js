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

});