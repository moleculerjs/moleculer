"use strict";

let errors = require("../../src/errors");

// Unit: OK!
describe("Test Errors", () => {

	it("test ServiceNotFoundError", () => {
		let err = new errors.ServiceNotFoundError("Something went wrong!", "posts.find");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe(410);
		expect(err.name).toBe("ServiceNotFoundError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.action).toBe("posts.find");
	});

	it("test RequestTimeoutError", () => {
		let data = {
			action: "posts.find"
		};
		let err = new errors.RequestTimeoutError(data, "server-2");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe(408);
		expect(err.name).toBe("RequestTimeoutError");
		expect(err.message).toBe("Request timed out when call 'posts.find' action on 'server-2' node!");
		expect(err.nodeID).toBe("server-2");
		expect(err.data).toBe(data);
	});

	it("test ValidationError", () => {
		let data = {};
		let err = new errors.ValidationError("Param is not correct!", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe(422);
		expect(err.name).toBe("ValidationError");
		expect(err.message).toBe("Param is not correct!");
		expect(err.data).toBe(data);
	});

});