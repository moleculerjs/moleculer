const ServiceBroker 			= require("../../../src/service-broker");
const { MoleculerError }		= require("../../../src/errors");
const Context 					= require("../../../src/context");
const Middleware 				= require("../../../src/middlewares").Metrics;
const { protectReject }			= require("../utils");

describe("Test MetricsMiddleware", () => {
	const broker = new ServiceBroker({ nodeID: "server-1", logger: false });
	const handler = jest.fn(() => Promise.resolve("Result"));
	const action = {
		name: "posts.find",
		handler
	};
	const endpoint = {
		action,
		node: {
			id: broker.nodeID
		}
	};

	const mw = Middleware();

	it("should register hooks", () => {
		expect(mw.localAction).toBeInstanceOf(Function);
	});

	it("should not wrap handler if metrics is disabled", () => {
		broker.options.metrics = false;

		const newHandler = mw.localAction.call(broker, handler, action);

		expect(newHandler).toBe(handler);
	});

	it("should wrap handler if metrics is enabled", () => {
		broker.options.metrics = true;

		const newHandler = mw.localAction.call(broker, handler, action);
		expect(newHandler).not.toBe(handler);
	});


	it("should send metric events if handler is resolved", () => {
		broker.options.metrics = true;
		handler.mockClear();
		const newHandler = mw.localAction.call(broker, handler, action);
		broker.emit = jest.fn();

		const ctx = Context.create(broker, endpoint);

		return newHandler(ctx).catch(protectReject).then(res => {
			expect(res).toBe("Result");
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"startTime": ctx.startTime
			});

			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"startTime": ctx.startTime,
				"endTime": ctx.stopTime,
				"duration": ctx.duration,
				"fromCache": false,
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
			});
		});
	});

	it("should send metric events if handler is rejected", () => {
		let err = new MoleculerError("Some error", 502, "SOME_ERROR", { a: 5 });
		let handler = jest.fn(() => Promise.reject(err));
		const newHandler = mw.localAction.call(broker, handler, action);
		broker.emit = jest.fn();

		const ctx = Context.create(broker, endpoint);
		return newHandler(ctx).then(protectReject).catch(res => {
			expect(res).toBe(err);
			expect(handler).toHaveBeenCalledTimes(1);

			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"startTime": ctx.startTime
			});

			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {
				"id": ctx.id,
				"nodeID": "server-1",
				"action": {"name": "posts.find" },
				"startTime": ctx.startTime,
				"endTime": ctx.stopTime,
				"duration": ctx.duration,
				"fromCache": false,
				"level": 1,
				"remoteCall": false,
				"requestID": ctx.requestID,
				"error": {"code": 502, "message": "Some error", "name": "MoleculerError", "type": "SOME_ERROR" }
			});
		});
	});
});


describe("Test params & meta in events", () => {
	let broker = new ServiceBroker({ logger: false, metrics: true, nodeID: "master" });
	broker.emit = jest.fn();

	const mw = Middleware();
	const action = { name: "users.get", metrics: false, service: { name: "users", version: 2 } };
	const endpoint = { action, node: { id: broker.nodeID }};

	const handler = jest.fn(() => Promise.resolve());
	const newHandler = mw.localAction.call(broker, handler, action);

	const ctx = Context.create(broker, endpoint);

	it("should not inject params & meta to the payload", () => {
		broker.emit.mockClear();
		ctx.parentID = 123;
		ctx.requestID = "abcdef";
		ctx.callerNodeID = "remote-node";

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node"
			});
		});
	});

	it("should have been called with params and meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get",
			params: { username: "string", pass: "string" },
			metrics: { params: true, meta: true }
		};
		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = { user: { id: 4 }};

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": { "pass": "pass", "username": "user" },
				"meta": { user: { id: 4 }},
			});
		});
	});

	it("should have been called with params and without meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: true, meta: false }
		};

		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = { user: { id: 4 }};

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": { "pass": "pass", "username": "user" }
			});
		});
	});

	it("should have been called with array of field params and without meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: ["username"], meta: false }
		};
		ctx.params = { username: "user", pass: "pass" };

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": { "username": "user" }
			});
		});
	});

	it("should have been called with array of field meta and without params", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { meta: ["user", "token"] }
		};
		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = {
			user: "John",
			token: 123456,
			session: "00001"
		};

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"meta": { user: "John", token: 123456 }
			});
		});
	});

	it("should have been called with function map of params and without meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: (params) => { return params.username + "@" + params.pass; }, meta: false }
		};
		ctx.params = { username: "user", pass: "pass" };

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"params": "user@pass"
			});
		});
	});

	it("should have been called without params & array of field meta", () => {
		broker.emit.mockClear();
		ctx.action = {
			name: "users.get", params: { username: "string", pass: "string" },
			metrics: { params: false, meta: (meta) => { return meta.token + "@" + meta.session; } }
		};
		ctx.params = { username: "user", pass: "pass" };
		ctx.meta = {
			user: "John",
			token: 123456,
			session: "00001"
		};

		return newHandler(ctx).catch(protectReject).then(() => {
			expect(broker.emit).toHaveBeenCalledTimes(2);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {
				"id": ctx.id,
				"service": {"name": "users", "version": 2},
				"action": { "name": "users.get" },
				"level": 1,
				"parent": 123,
				"remoteCall": true,
				"requestID": "abcdef",
				"startTime": ctx.startTime,
				"nodeID": broker.nodeID,
				"callerNodeID": "remote-node",
				"meta": "123456@00001"
			});
		});
	});
});
