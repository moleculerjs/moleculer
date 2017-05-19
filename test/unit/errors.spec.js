"use strict";

let errors = require("../../src/errors");


describe("Test Errors", () => {

	it("test CustomError", () => {
		let err = new errors.CustomError("Something went wrong!", 555, { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.CustomError);
		expect(err.code).toBe(555);
		expect(err.name).toBe("CustomError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.data).toEqual({ a: 5});
	});

	it("test ServiceNotFoundError", () => {
		let err = new errors.ServiceNotFoundError("Something went wrong!", { action: "posts.find" });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ServiceNotFoundError);
		expect(err.code).toBe(501);
		expect(err.name).toBe("ServiceNotFoundError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.data).toEqual({ action: "posts.find" });
	});

	it("test RequestTimeoutError", () => {
		// let data = {
		// 	action: "posts.find"
		// };
		let err = new errors.RequestTimeoutError("posts.find", "server-2");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.RequestTimeoutError);
		expect(err.code).toBe(504);
		expect(err.name).toBe("RequestTimeoutError");
		expect(err.message).toBe("Request timed out when call 'posts.find' action on 'server-2' node!");
		expect(err.nodeID).toBe("server-2");
		//expect(err.data).toBe(data);
	});

	it("test RequestSkippedError", () => {
		let err = new errors.RequestSkippedError("posts.find");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.RequestSkippedError);
		expect(err.code).toBe(514);
		expect(err.name).toBe("RequestSkippedError");
		expect(err.message).toBe("Action 'posts.find' call is skipped because timeout reached!");
		//expect(err.nodeID).toBe("server-2");
		//expect(err.data).toBe(data);
	});

	it("test ValidationError", () => {
		let data = {};
		let err = new errors.ValidationError("Param is not correct!", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ValidationError);
		expect(err.code).toBe(422);
		expect(err.name).toBe("ValidationError");
		expect(err.message).toBe("Param is not correct!");
		expect(err.data).toBe(data);
	});

});