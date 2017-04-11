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
		expect(ctx.parentID).toBeNull();
		expect(ctx.level).toBe(1);
		
		expect(ctx.timeout).toBe(0);
		expect(ctx.retryCount).toBe(0);

		expect(ctx.params).toEqual({});

		expect(ctx.meta).toEqual({});

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
			meta: {
				user: 1
			},
			timeout: 2000,
			retryCount: 2
		};
		let ctx = new Context(opts);

		expect(ctx.opts).toEqual(opts);
		expect(ctx.broker).toBeDefined();
		expect(ctx.action).toBeDefined();
		expect(ctx.nodeID).toBeDefined();
		expect(ctx.meta).toEqual({ user: 1 });
		expect(ctx.parentID).toBeDefined();
		expect(ctx.level).toBe(2);

		expect(ctx.timeout).toBe(2000);
		expect(ctx.retryCount).toBe(2);

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
				id: "parent123",
				level: 1,
				requestID: "111"
			},
			broker,
			action: {},
			requestID: "123",
			level: 3,
			metrics: true
		};
		let ctx = new Context(opts);

		expect(ctx.opts).toEqual(opts);
		expect(ctx.nodeID).not.toBeDefined();

		expect(ctx.id).toBeDefined();

		expect(ctx.level).toBe(3);
		expect(ctx.metrics).toBe(true);
		expect(ctx.requestID).toBe("123");

		expect(ctx.startTime).toBeNull();
		expect(ctx.startHrTime).toBeNull();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(ctx.cachedResult).toBe(false);
	});

	it("test with metas", () => {

		let broker = new ServiceBroker({ metrics: true });

		let opts = {
			id: "12345",
			parent: {
				id: "parent123",
				meta: {
					a: 5,
					b: "Hello"
				}
			},
			broker,
			action: {},
			meta: {
				b: "Hi",
				c: 100
			},
			metrics: true
		};
		let ctx = new Context(opts);

		expect(ctx.id).toBe("12345");
		expect(ctx.meta).toEqual({
			a: 5,
			b: "Hi",
			c: 100
		});
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

	it("should call broker.call method with options", () => {
		broker.call.mockClear();

		let ctx = new Context({ broker });

		let p = { id: 5 };
		ctx.call("posts.find", p, { timeout: 2500 });

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, { parentCtx: ctx, timeout: 2500 });
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
