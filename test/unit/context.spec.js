"use strict";

let Context = require("../../src/context");
let ServiceBroker = require("../../src/service-broker");
let { ServiceNotFoundError } = require("../../src/errors");


describe("Test Context", () => {

	it("test with empty opts", () => {

		let ctx = new Context();

		expect(ctx.opts).toBeDefined();
		expect(ctx.opts).toEqual({});
		expect(ctx.broker).not.toBeDefined();
		expect(ctx.action).not.toBeDefined();
		expect(ctx.nodeID).not.toBeDefined();
		expect(ctx.user).not.toBeDefined();
		expect(ctx.parent).not.toBeDefined();
		expect(ctx.level).toBe(1);

		expect(ctx.params).toEqual({});

		expect(ctx.id).not.toBeDefined();

		expect(ctx.metrics).toBe(false);
		expect(ctx.requestID).not.toBeDefined();

		expect(ctx.startTime).not.toBeDefined();
		expect(ctx.startHrTime).not.toBeDefined();
		expect(ctx.stopTime).not.toBeDefined();
		expect(ctx.duration).not.toBeDefined();

		expect(ctx.cachedResult).toBe(false);
	});

	it("test with options", () => {

		let broker = new ServiceBroker();

		let opts = {
			requestID: 123,
			parent: {
				id: "parent123",
				level: 1
			},
			broker,
			action: {},
			params: {
				b: 5
			},
			nodeID: "node-1",
			user: {
				id: 1
			}
		};
		let ctx = new Context(opts);

		expect(ctx.opts).toEqual(opts);
		expect(ctx.broker).toBeDefined();
		expect(ctx.action).toBeDefined();
		expect(ctx.nodeID).toBeDefined();
		expect(ctx.user).toEqual({ id: 1 });
		expect(ctx.parent).toBeDefined();
		expect(ctx.level).toBe(2);

		expect(ctx.params).toEqual({ b: 5 });

		expect(ctx.id).toBeDefined();

		expect(ctx.metrics).toBe(false);
		expect(ctx.requestID).not.toBeDefined();

		expect(ctx.startTime).not.toBeDefined();
		expect(ctx.startHrTime).not.toBeDefined();
		expect(ctx.stopTime).not.toBeDefined();
		expect(ctx.duration).not.toBeDefined();

		expect(ctx.cachedResult).toBe(false);		
		
	});

	it("test with metrics", () => {

		let broker = new ServiceBroker({ metrics: true });

		let opts = {
			parent: {
				id: "parent123"
			},
			broker,
			action: {},
			requestID: "123",
			metrics: true
		};
		let ctx = new Context(opts);

		expect(ctx.opts).toEqual(opts);
		expect(ctx.nodeID).not.toBeDefined();

		expect(ctx.id).toBeDefined();

		expect(ctx.metrics).toBe(true);
		expect(ctx.requestID).toBe("123");

		expect(ctx.startTime).toBeNull();
		expect(ctx.startHrTime).toBeNull();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(ctx.cachedResult).toBe(false);
	});
});


describe("Test createSubContext", () => {

	let broker = new ServiceBroker();

	let opts = {
		id: 123,
		parent: {},
		broker,
		action: {},
		user: { id: 5 },
		params: {
			b: 5
		}
	};
	let ctx = new Context(opts);

	it("test with empty params", () => {
		let subCtx = ctx.createSubContext();
		expect(subCtx).not.toBe(ctx);
		expect(subCtx.id).not.toBeDefined();
		expect(subCtx.requestID).toBe(ctx.requestID);
		expect(subCtx.parent).toBe(ctx);
		expect(subCtx.broker).toBe(ctx.broker);
		expect(subCtx.action).toBe(ctx.action);
		expect(subCtx.nodeID).toBeUndefined();
		expect(subCtx.level).toBe(2);
		expect(subCtx.params).toEqual({});
		expect(subCtx.user).toEqual({ id: 5 });
	});

	it("test with params", () => {
		let action2 = {};
		let params2 = { a: 11 };
		let node2 = "node-2";

		let subCtx = ctx.createSubContext(action2, params2, node2);
		expect(subCtx).not.toBe(ctx);
		expect(subCtx.id).not.toBe(ctx.id);
		expect(subCtx.requestID).toBe(ctx.requestID);
		expect(subCtx.parent).toBe(ctx);
		expect(subCtx.broker).toBe(ctx.broker);
		expect(subCtx.action).toBe(action2);
		expect(subCtx.nodeID).toBe(node2);
		expect(subCtx.params).toEqual(params2);
	});
});

describe("Test setParams", () => {
	it("should override the params", () => {

		let params1 = {	a: 1 };
		let params2 = {	b: 5 };

		let ctx = new Context({
			params: params1
		});
		expect(ctx.params).toBe(params1);

		ctx.setParams(params2);

		expect(ctx.params).not.toBe(params1);
		expect(ctx.params).toBe(params2);
	});

	it("should clone the params", () => {

		let params1 = {
			a: 1
		};

		let ctx = new Context({
			params: params1,
			cloneParams: true
		});

		let params2 = {
			b: 5
		};

		ctx.setParams(params2);
		expect(ctx.params).not.toBe(params2);
		expect(ctx.params).toEqual(params2);
	});	
});


describe("Test call method", () => {
	let broker = new ServiceBroker();
	broker.call = jest.fn();

	it("should call broker.call method with itself", () => {
		let ctx = new Context({ broker });

		let p = { id: 5 };
		ctx.call("posts.find", p);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, { parentCtx: ctx });
	});
});

describe("Test emit method", () => {
	let broker = new ServiceBroker();
	broker.emit = jest.fn();

	let ctx = new Context({ broker });

	it("should call broker.emit method with object param", () => {
		let data = { id: 5 };
		ctx.emit("request.rest", data);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", data);
	});

	it("should call broker.emit method with string param", () => {
		broker.emit.mockClear();
		ctx.emit("request.rest", "string-data");
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", "string-data");		
	});
});
/*
describe("Test invoke method", () => {
	let broker = new ServiceBroker();
	let ctx = new Context();
	ctx.logger = broker.getLogger();
	
	ctx._startInvoke = jest.fn();
	ctx._finishInvoke = jest.fn();
	let response = { id: 5 };

	it("should call start & finishInvoke method", () => {
		let handler = jest.fn(() => response);

		let p = ctx.invoke(handler);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.then((data) => {
			expect(ctx._startInvoke).toHaveBeenCalledTimes(1);
			expect(ctx._finishInvoke).toHaveBeenCalledTimes(1);
			expect(data).toBe(response);
		});
	});

	it("should call start & finishInvoke method if handler return Promise", () => {
		ctx._startInvoke.mockClear();
		ctx._finishInvoke.mockClear();
		let handler = jest.fn(() => Promise.resolve(response));

		let p = ctx.invoke(handler);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.then((data) => {
			expect(ctx._startInvoke).toHaveBeenCalledTimes(1);
			expect(ctx._finishInvoke).toHaveBeenCalledTimes(1);
			expect(data).toBe(response);
		});
	});	

	it("should call closeContext method if error catched", () => {
		ctx._startInvoke.mockClear();
		ctx._finishInvoke.mockClear();
		let handler = jest.fn(() => Promise.reject(new ServiceNotFoundError("Something happened")));

		let p = ctx.invoke(handler);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.catch((err) => {
			expect(ctx._startInvoke).toHaveBeenCalledTimes(1);
			expect(ctx._finishInvoke).toHaveBeenCalledTimes(1);
			expect(ctx.error).toBe(err);
			expect(err).toBeDefined();
			expect(err).toBeInstanceOf(Error);
			expect(err).toBeInstanceOf(ServiceNotFoundError);
			expect(err.ctx).toBe(ctx);
		});
	});

	it("should return Error if handler reject a string", () => {
		ctx._startInvoke.mockClear();
		ctx._finishInvoke.mockClear();
		let handler = jest.fn(() => Promise.reject("Some error message"));

		let p = ctx.invoke(handler);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.catch((err) => {
			expect(ctx._startInvoke).toHaveBeenCalledTimes(1);
			expect(ctx._finishInvoke).toHaveBeenCalledTimes(1);
			expect(ctx.error).toBe(err);
			expect(err).toBeDefined();
			expect(err).toBeInstanceOf(Error);
			expect(err.ctx).toBe(ctx);
		});
	});	

	it("should return Error if handler throw exception", () => {
		ctx._startInvoke.mockClear();
		ctx._finishInvoke.mockClear();
		let handler = jest.fn(() => { throw new Error("Exception"); });

		let p = ctx.invoke(handler);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.catch((err) => {
			expect(ctx._startInvoke).toHaveBeenCalledTimes(1);
			expect(ctx._finishInvoke).toHaveBeenCalledTimes(1);
			expect(ctx.error).toBe(err);
			expect(err).toBeDefined();
			expect(err).toBeInstanceOf(Error);
			expect(err.ctx).toBe(ctx);
		});
	});		
});
*/

describe("Test _metricStart method", () => {
	let broker = new ServiceBroker({ metrics: true });
	let ctx = new Context({ broker, requestID: "abcdef", parent: { id: 123 }, action: { name: "users.get" }, metrics: true });
	broker.emit = jest.fn();

	it("should emit start event", () => {		
		ctx._metricStart();

		expect(ctx.startTime).toBeDefined();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {"action": {"name": "users.get"}, "id": ctx.id, "level": 1, "parent": 123, "remoteCall": false, "requestID": "abcdef", "startTime": ctx.startTime});
	});
});

describe("Test _metricFinish method", () => {
	let broker = new ServiceBroker({ metrics: true });
	let ctx = new Context({ broker, nodeID: "server-2", parent: { id: 123 }, action: { name: "users.get" }, metrics: true });
	broker.emit = jest.fn();
	ctx._metricStart();

	it("should emit finish event", () => {		
		broker.emit.mockClear();
		return new Promise(resolve => {
			setTimeout(() => {
				ctx._metricFinish();

				expect(ctx.stopTime).toBeGreaterThan(0);
				expect(ctx.duration).toBeGreaterThan(0);

				expect(broker.emit).toHaveBeenCalledTimes(1);
				expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {"action": {"name": "users.get"}, "duration": ctx.duration, "id": ctx.id, "parent": 123, "requestID": ctx.requestID, "endTime": ctx.stopTime, "fromCache": false, "level": 1, "remoteCall": true});

				resolve();
			}, 100);
		});
	});

	it("should emit finish event with error", () => {		
		broker.emit.mockClear();
		return new Promise(resolve => {
			ctx._metricFinish(new ServiceNotFoundError("Something happened"));

			expect(ctx.stopTime).toBeGreaterThan(0);

			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {"action": {"name": "users.get"}, "duration": ctx.duration, "error": { "message": "Something happened", "type": "ServiceNotFoundError" }, "id": ctx.id, "parent": 123, "requestID": ctx.requestID, "endTime": ctx.stopTime, "fromCache": false, "level": 1, "remoteCall": true });

			resolve();
		});
	});
});
