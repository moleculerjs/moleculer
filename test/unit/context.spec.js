"use strict";

let Promise = require("bluebird");
let Context = require("../../src/context");
let ServiceBroker = require("../../src/service-broker");
let { ServiceNotFoundError, RequestSkippedError } = require("../../src/errors");


describe("Test Context", () => {

	it("test with empty opts", () => {

		let ctx = new Context();

		expect(ctx.id).toBeNull();
		expect(ctx.broker).not.toBeDefined();
		expect(ctx.action).not.toBeDefined();
		expect(ctx.nodeID).toBeNull();
		expect(ctx.parentID).toBeNull();

		expect(ctx.metrics).toBe(false);
		expect(ctx.level).toBe(1);
		
		expect(ctx.timeout).toBe(0);
		expect(ctx.retryCount).toBe(0);

		expect(ctx.params).toEqual({});
		expect(ctx.meta).toEqual({});

		expect(ctx.requestID).toBeNull();
		expect(ctx.startTime).toBeNull();
		expect(ctx.startHrTime).toBeNull();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(ctx.cachedResult).toBe(false);
	});

	it("test with constructor params", () => {

		let broker = new ServiceBroker();
		let action = {
			name: "posts.find"
		};

		let ctx = new Context(broker, action);

		expect(ctx.broker).toBe(broker);
		expect(ctx.action).toBe(action);
	});
});

describe("Test setParams", () => {
	it("should override the params", () => {

		let params1 = {	a: 1 };
		let params2 = {	b: 5 };

		let ctx = new Context();
		ctx.params = params1;

		ctx.setParams(params2);

		expect(ctx.params).not.toBe(params1);
		expect(ctx.params).toBe(params2);
	});

	it("should clone the params", () => {

		let params1 = {
			a: 1
		};

		let ctx = new Context();
		ctx.params1 = params1;

		let params2 = {
			b: 5
		};

		ctx.setParams(params2, true);
		expect(ctx.params).not.toBe(params2);
		expect(ctx.params).toEqual(params2);
	});	
});


describe("Test call method", () => {
	let broker = new ServiceBroker();
	broker.call = jest.fn();

	it("should call broker.call method with itself", () => {
		let ctx = new Context(broker);

		let p = { id: 5 };
		ctx.call("posts.find", p);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, { parentCtx: ctx });
	});

	it("should call broker.call method with options", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);

		let p = { id: 5 };
		ctx.call("posts.find", p, { timeout: 2500 });

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, { parentCtx: ctx, timeout: 2500 });
	});

	it("should decrement the timeout with elapsed time", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);
		ctx._metricStart();
		ctx.timeout = 1000;
		return Promise.delay(300).then(() => {
			ctx.call("posts.find", {});

			expect(broker.call).toHaveBeenCalledTimes(1);
			let opts = broker.call.mock.calls[0][2];
			expect(opts.timeout).toBeGreaterThan(500);
			expect(opts.timeout).toBeLessThan(800);
		});
	});

	it("should throw RequestSkippedError", () => {
		broker.call.mockClear();

		let ctx = new Context(broker);
		ctx._metricStart();
		ctx.timeout = 200;
		return Promise.delay(300).then(() => {
			return ctx.call("posts.find", {});
		}).catch(err => {
			expect(err).toBeInstanceOf(RequestSkippedError);
			expect(err.action).toBe("posts.find");
		});
	});
});

describe("Test emit method", () => {
	let broker = new ServiceBroker();
	broker.emit = jest.fn();

	let ctx = new Context(broker);

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
	let ctx = new Context(broker, { name: "users.get" });
	ctx.requestID = "abcdef";
	ctx.parentID = 123;
	ctx.metrics = true;

	broker.emit = jest.fn();

	it("should not emit start event", () => {		
		ctx._metricStart();

		expect(ctx.startTime).toBeDefined();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(broker.emit).toHaveBeenCalledTimes(0);
	});

	it("should emit start event", () => {		
		broker.emit.mockClear();
		ctx._metricStart(true);

		expect(ctx.startTime).toBeDefined();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.start", {"action": {"name": "users.get"}, "id": ctx.id, "level": 1, "parent": 123, "remoteCall": false, "requestID": "abcdef", "startTime": ctx.startTime});
	});
});

describe("Test _metricFinish method", () => {
	let broker = new ServiceBroker({ metrics: true });
	let ctx = new Context(broker, { name: "users.get" });
	ctx.nodeID = "server-2";
	ctx.parentID = 123;
	ctx.metrics = true;
	ctx.generateID();	

	broker.emit = jest.fn();
	ctx._metricStart();

	it("should emit finish event", () => {		
		broker.emit.mockClear();
		return new Promise(resolve => {
			setTimeout(() => {
				ctx._metricFinish(null, true);

				expect(ctx.stopTime).toBeGreaterThan(0);
				expect(ctx.duration).toBeGreaterThan(0);

				expect(broker.emit).toHaveBeenCalledTimes(1);
				expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {"action": {"name": "users.get"}, "duration": ctx.duration, "id": ctx.id, "parent": 123, "requestID": ctx.requestID, "startTime": ctx.startTime, "endTime": ctx.stopTime, "fromCache": false, "level": 1, "remoteCall": true});

				resolve();
			}, 100);
		});
	});

	it("should emit finish event with error", () => {		
		broker.emit.mockClear();
		return new Promise(resolve => {
			ctx._metricFinish(new ServiceNotFoundError("Something happened"), true);

			expect(ctx.stopTime).toBeGreaterThan(0);

			expect(broker.emit).toHaveBeenCalledTimes(1);
			expect(broker.emit).toHaveBeenCalledWith("metrics.trace.span.finish", {"action": {"name": "users.get"}, "duration": ctx.duration, "error": { "message": "Something happened", "type": "ServiceNotFoundError" }, "id": ctx.id, "parent": 123, "requestID": ctx.requestID, "startTime": ctx.startTime, "endTime": ctx.stopTime, "fromCache": false, "level": 1, "remoteCall": true });

			resolve();
		});
	});

	it("should not emit finish event", () => {		
		broker.emit.mockClear();
		return new Promise(resolve => {
			setTimeout(() => {
				ctx._metricFinish();

				expect(ctx.stopTime).toBeGreaterThan(0);
				expect(ctx.duration).toBeGreaterThan(0);

				expect(broker.emit).toHaveBeenCalledTimes(0);

				resolve();
			}, 100);
		});
	});	
});
