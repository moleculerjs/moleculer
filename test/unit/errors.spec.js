"use strict";

let errors = require("../../src/errors");


describe("Test Errors", () => {

	it("test MoleculerError", () => {
		let err = new errors.MoleculerError("Something went wrong!", 555, "ERR_TYPE", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerError);
		expect(err.name).toBe("MoleculerError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.code).toBe(555);
		expect(err.type).toBe("ERR_TYPE");
		expect(err.data).toEqual({ a: 5});
	});

	it("test MaxCallLevelError", () => {
		let err = new errors.MaxCallLevelError({ level: 10 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MaxCallLevelError);
		expect(err.code).toBe(500);
		expect(err.name).toBe("MaxCallLevelError");
		expect(err.message).toBe("Request level is reached the limit!");
		expect(err.data).toEqual({ level: 10 });
	});

	it("test ServiceNotFoundError", () => {
		let err = new errors.ServiceNotFoundError("posts.find");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ServiceNotFoundError);
		expect(err.code).toBe(404);
		expect(err.name).toBe("ServiceNotFoundError");
		expect(err.message).toBe("Service 'posts.find' is not available!");
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
		expect(err.data.nodeID).toBe("server-2");
	});

	it("test RequestSkippedError", () => {
		let err = new errors.RequestSkippedError("posts.find", "server-3");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.RequestSkippedError);
		expect(err.code).toBe(514);
		expect(err.name).toBe("RequestSkippedError");
		expect(err.message).toBe("Calling 'posts.find' is skipped because timeout reached on 'server-3' node!");
		expect(err.data.action).toBe("posts.find");
		expect(err.data.nodeID).toBe("server-3");
	});

	it("test ValidationError", () => {
		let data = {};
		let err = new errors.ValidationError("Param is not correct!", "ERR_TYPE", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ValidationError);
		expect(err.name).toBe("ValidationError");
		expect(err.message).toBe("Param is not correct!");
		expect(err.code).toBe(422);
		expect(err.type).toBe("ERR_TYPE");
		expect(err.data).toBe(data);
	});

	it("test ServiceSchemaError", () => {
		let err = new errors.ServiceSchemaError("Invalid schema");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ServiceSchemaError);
		expect(err.name).toBe("ServiceSchemaError");
		expect(err.message).toBe("Invalid schema");
	});

});
