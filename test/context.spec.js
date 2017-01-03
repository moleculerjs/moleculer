"use strict";

let _ = require("lodash");
let Context = require("../src/context");
let ServiceBroker = require("../src/service-broker");

describe("Test Context", () => {

	it("test with empty opts", () => {

		let ctx = new Context();

		expect(ctx.id).toBeDefined();
		expect(ctx.requestID).toBeDefined();
		expect(ctx.requestID).toBe(ctx.id);
		expect(ctx.opts).toBeDefined();
		expect(ctx.parent).not.toBeDefined();
		expect(ctx.broker).not.toBeDefined();
		expect(ctx.action).not.toBeDefined();
		expect(ctx.logger).not.toBeDefined();
		expect(ctx.level).toBe(1);
		expect(ctx.params).toBeDefined();
		expect(ctx.params).toEqual({});

		let params = {
			a: 1
		};

		ctx.setParams(params);
		expect(ctx.params).not.toBe(params); // Cloned
		expect(ctx.params).toEqual(params);		
	});

	it("test with options", () => {

		let broker = new ServiceBroker({ metrics: true });
		broker.emit = jest.fn();

		let opts = {
			requestID: 123,
			parent: {
				id: "parent123"
			},
			broker,
			action: {},
			params: {
				b: 5
			}
		};
		let ctx = new Context(opts);

		expect(ctx.id).toBeDefined();
		expect(ctx.requestID).toBe(opts.requestID);
		expect(ctx.opts).toEqual(opts);
		expect(ctx.parent).toBeDefined();
		expect(ctx.broker).toBe(broker);
		expect(ctx.action).toBeDefined();
		expect(ctx.level).toBe(1);
		expect(ctx.params).toEqual({ b: 5 });

		// Test call method
		broker.call = jest.fn();

		let p = { id: 5 };
		ctx.call("posts.find", p);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, ctx);

		// Test emit method

		let data = { id: 5 };
		ctx.emit("request.rest", data);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", data);

		broker.emit.mockClear();
		ctx.emit("request.rest", "string-data");
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", "string-data");		
	});
});

describe("Test createSubContext", () => {

	let broker = new ServiceBroker();

	let opts = {
		id: 123,
		parent: {},
		broker,
		action: {},
		params: {
			b: 5
		}
	};
	let ctx = new Context(opts);

	it("test with empty params", () => {
		let subCtx = ctx.createSubContext();
		expect(subCtx).not.toBe(ctx);
		expect(subCtx.id).not.toBe(ctx.id);
		expect(subCtx.requestID).toBe(ctx.requestID);
		expect(subCtx.parent).toBe(ctx);
		expect(subCtx.broker).toBe(ctx.broker);
		expect(subCtx.action).toBe(ctx.action);
		expect(subCtx.params).toBeNull;
	});

	it("test with params", () => {
		let action2 = {};
		let params2 = { a: 11 };

		let subCtx = ctx.createSubContext(action2, params2);
		expect(subCtx).not.toBe(ctx);
		expect(subCtx.id).not.toBe(ctx.id);
		expect(subCtx.requestID).toBe(ctx.requestID);
		expect(subCtx.parent).toBe(ctx);
		expect(subCtx.broker).toBe(ctx.broker);
		expect(subCtx.action).toBe(action2);
		expect(subCtx.params).toEqual(params2);
	});
});

describe("Test invoke method", () => {
	let ctx = new Context();
	ctx._startInvoke = jest.fn();
	ctx._finishInvoke = jest.fn();

	it("should call start & finishInvoke method", () => {
		let response = { id: 5 };
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

	it("should call closeContext method", () => {
		ctx._startInvoke.mockClear();
		ctx._finishInvoke.mockClear();
		let handler = jest.fn(() => Promise.reject(new Error("Something happened")));

		let p = ctx.invoke(handler);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.catch((err) => {
			expect(ctx._startInvoke).toHaveBeenCalledTimes(1);
			expect(ctx._finishInvoke).toHaveBeenCalledTimes(1);
			expect(err).toBeDefined();
			expect(err.ctx).toBe(ctx);
		});
	});	
});

describe("Test startInvoke", () => {
	let broker = new ServiceBroker({ metrics: true });
	let ctx = new Context({ broker, parent: { id: 123 }, action: { name: "users.get" } });
	broker.emit = jest.fn();

	it("should call _metricFinish method", () => {		
		ctx._startInvoke();

		expect(ctx.startTime).toBeDefined();
		expect(ctx.stopTime).toBeNull();
		expect(ctx.duration).toBe(0);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("metrics.context.start", {"action": {"name": "users.get"}, "id": ctx.id, "parent": 123, "requestID": ctx.requestID, "time": ctx.startTime});
	});
});

describe("Test finishInvoke", () => {
	let broker = new ServiceBroker({ metrics: true });
	let ctx = new Context({ broker, parent: { id: 123, duration: 0 }, action: { name: "users.get" } });
	broker.emit = jest.fn();

	it("should call _metricFinish method", () => {		
		return new Promise((resolve) => {
			setTimeout(() => {
				ctx._finishInvoke();

				expect(ctx.stopTime).toBeGreaterThan(0);
				expect(ctx.duration).toBeGreaterThan(0);
				expect(ctx.parent.duration).toBe(ctx.duration);

				expect(broker.emit).toHaveBeenCalledTimes(1);
				expect(broker.emit).toHaveBeenCalledWith("metrics.context.finish", {"action": {"name": "users.get"}, "duration": ctx.duration, "id": ctx.id, "parent": 123, "requestID": ctx.requestID, "time": ctx.stopTime});

				resolve();
			}, 100);
		});
	});
});