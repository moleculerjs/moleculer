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
		expect(err.retryable).toBe(false);
	});

	it("test MoleculerRetryableError", () => {
		let err = new errors.MoleculerRetryableError("Something went wrong!", 555, "ERR_TYPE", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerError);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err.name).toBe("MoleculerRetryableError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.code).toBe(555);
		expect(err.type).toBe("ERR_TYPE");
		expect(err.data).toEqual({ a: 5});
		expect(err.retryable).toBe(true);
	});

	it("test MoleculerServerError", () => {
		let err = new errors.MoleculerServerError("Something went wrong!", 555, "ERR_TYPE", { a: 5 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerError);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.MoleculerServerError);
		expect(err.name).toBe("MoleculerServerError");
		expect(err.message).toBe("Something went wrong!");
		expect(err.code).toBe(555);
		expect(err.type).toBe("ERR_TYPE");
		expect(err.data).toEqual({ a: 5});
		expect(err.retryable).toBe(true);
	});

	it("test MoleculerClientError", () => {
		let err = new errors.MoleculerClientError("Client error!");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerError);
		expect(err).toBeInstanceOf(errors.MoleculerClientError);
		expect(err.code).toBe(400);
		expect(err.name).toBe("MoleculerClientError");
		expect(err.message).toBe("Client error!");
		//expect(err.data).toEqual({ action: "posts.find" });
		expect(err.retryable).toBe(false);
	});

	it("test ServiceNotFoundError", () => {
		let err = new errors.ServiceNotFoundError("posts.find");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.ServiceNotFoundError);
		expect(err.code).toBe(404);
		expect(err.name).toBe("ServiceNotFoundError");
		expect(err.message).toBe("Service 'posts.find' is not found.");
		expect(err.data).toEqual({ action: "posts.find" });
		expect(err.retryable).toBe(true);
	});

	it("test ServiceNotFoundError with nodeID", () => {
		let err = new errors.ServiceNotFoundError("posts.find", "node-2");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.ServiceNotFoundError);
		expect(err.code).toBe(404);
		expect(err.name).toBe("ServiceNotFoundError");
		expect(err.message).toBe("Service 'posts.find' is not found on 'node-2' node.");
		expect(err.data).toEqual({ action: "posts.find", nodeID: "node-2" });
		expect(err.retryable).toBe(true);
	});

	it("test ServiceNotAvailableError", () => {
		let err = new errors.ServiceNotAvailableError("posts.find");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.ServiceNotAvailableError);
		expect(err.code).toBe(404);
		expect(err.name).toBe("ServiceNotAvailableError");
		expect(err.message).toBe("Service 'posts.find' is not available.");
		expect(err.data).toEqual({ action: "posts.find" });
		expect(err.retryable).toBe(true);
	});

	it("test ServiceNotAvailableError with NodeID", () => {
		let err = new errors.ServiceNotAvailableError("posts.find", "server-2");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.ServiceNotAvailableError);
		expect(err.code).toBe(404);
		expect(err.name).toBe("ServiceNotAvailableError");
		expect(err.message).toBe("Service 'posts.find' is not available on 'server-2' node.");
		expect(err.data).toEqual({ action: "posts.find", nodeID: "server-2" });
		expect(err.retryable).toBe(true);
	});

	it("test RequestTimeoutError", () => {
		let err = new errors.RequestTimeoutError("posts.find", "server-2");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.RequestTimeoutError);
		expect(err.code).toBe(504);
		expect(err.name).toBe("RequestTimeoutError");
		expect(err.message).toBe("Request is timed out when call 'posts.find' action on 'server-2' node.");
		expect(err.data.nodeID).toBe("server-2");
		expect(err.retryable).toBe(true);
	});

	it("test RequestSkippedError", () => {
		let err = new errors.RequestSkippedError("posts.find", "server-3");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerError);
		expect(err).toBeInstanceOf(errors.RequestSkippedError);
		expect(err.code).toBe(514);
		expect(err.name).toBe("RequestSkippedError");
		expect(err.message).toBe("Calling 'posts.find' is skipped because timeout reached on 'server-3' node.");
		expect(err.data.action).toBe("posts.find");
		expect(err.data.nodeID).toBe("server-3");
		expect(err.retryable).toBe(false);
	});

	it("test RequestRejectedError", () => {
		let err = new errors.RequestRejectedError("posts.find", "server-3");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.RequestRejectedError);
		expect(err.code).toBe(503);
		expect(err.name).toBe("RequestRejectedError");
		expect(err.message).toBe("Request is rejected when call 'posts.find' action on 'server-3' node.");
		expect(err.data.action).toBe("posts.find");
		expect(err.data.nodeID).toBe("server-3");
		expect(err.retryable).toBe(true);
	});

	it("test QueueIsFullError", () => {
		let err = new errors.QueueIsFullError("posts.find", "server-3", 100, 50);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerRetryableError);
		expect(err).toBeInstanceOf(errors.QueueIsFullError);
		expect(err.code).toBe(429);
		expect(err.name).toBe("QueueIsFullError");
		expect(err.message).toBe("Queue is full. Request 'posts.find' action on 'server-3' node is rejected.");
		expect(err.data.action).toBe("posts.find");
		expect(err.data.nodeID).toBe("server-3");
		expect(err.data.size).toBe(100);
		expect(err.data.limit).toBe(50);
		expect(err.retryable).toBe(true);
	});

	it("test ValidationError", () => {
		let data = {};
		let err = new errors.ValidationError("Param is not correct!", "ERR_TYPE", data);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerClientError);
		expect(err).toBeInstanceOf(errors.ValidationError);
		expect(err.name).toBe("ValidationError");
		expect(err.message).toBe("Param is not correct!");
		expect(err.code).toBe(422);
		expect(err.type).toBe("ERR_TYPE");
		expect(err.data).toBe(data);
		expect(err.retryable).toBe(false);
	});

	it("test MaxCallLevelError", () => {
		let err = new errors.MaxCallLevelError("server-2", 10);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.MoleculerError);
		expect(err).toBeInstanceOf(errors.MaxCallLevelError);
		expect(err.code).toBe(500);
		expect(err.name).toBe("MaxCallLevelError");
		expect(err.message).toBe("Request level is reached the limit (10) on 'server-2' node.");
		expect(err.data).toEqual({ level: 10 });
		expect(err.retryable).toBe(false);
	});

	it("test ServiceSchemaError", () => {
		let err = new errors.ServiceSchemaError("Invalid schema def.");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ServiceSchemaError);
		expect(err.name).toBe("ServiceSchemaError");
		expect(err.message).toBe("Invalid schema def.");
		expect(err.code).toBe(500);
		expect(err.type).toBeNull();
		expect(err.data).toBeUndefined();
	});

	it("test GracefulStopTimeoutError", () => {
		let err = new errors.GracefulStopTimeoutError({ name: "posts", version: 2 });
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.GracefulStopTimeoutError);
		expect(err.name).toBe("GracefulStopTimeoutError");
		expect(err.message).toBe("Unable to stop 'posts' service gracefully.");
		expect(err.code).toBe(500);
		expect(err.type).toBeNull();
		expect(err.data).toEqual({
			name: "posts",
			version: 2
		});
	});

	it("test ProtocolVersionMismatchError", () => {
		let err = new errors.ProtocolVersionMismatchError("server-2", "2", "1");
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.ProtocolVersionMismatchError);
		expect(err.code).toBe(500);
		expect(err.name).toBe("ProtocolVersionMismatchError");
		expect(err.message).toBe("Protocol version mismatch.");
		expect(err.data).toEqual({ nodeID: "server-2", actual: "2", received: "1" });
		expect(err.retryable).toBe(false);
	});

	it("test InvalidPacketDataError", () => {
		let payload = {};
		let err = new errors.InvalidPacketDataError("INFO", payload);
		expect(err).toBeDefined();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(errors.InvalidPacketDataError);
		expect(err.code).toBe(500);
		expect(err.name).toBe("InvalidPacketDataError");
		expect(err.message).toBe("Invalid packet data.");
		expect(err.data).toEqual({ type: "INFO", payload });
		expect(err.retryable).toBe(false);
	});

});
