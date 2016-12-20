"use strict";

let _ = require("lodash");
let bus = require("../src/service-bus");
let Context = require("../src/context");
let ServiceBroker = require("../src/service-broker");

describe("Test Context", () => {

	it("test with empty opts", () => {

		let context = new Context();

		expect(context.id).toBeDefined();
		expect(context.opts).toBeDefined();
		expect(context.parent).not.toBeDefined();
		expect(context.service).not.toBeDefined();
		expect(context.action).not.toBeDefined();
		expect(context.broker).not.toBeDefined();
		expect(context.level).toBe(1);
		expect(context.params).toBeDefined();
		expect(context.params).toEqual({});

		expect(context.startTime).toBeDefined();
		expect(context.stopTime).toBeNull();
		expect(context.duration).toBe(0);

		let params = {
			a: 1
		};

		context.setParams(params);
		expect(context.params).not.toBe(params); // Cloned
		expect(context.params).toEqual(params);		
	});

	it("test with options", () => {

		let broker = new ServiceBroker();

		let opts = {
			id: 123,
			parent: {},
			service: {
				broker: broker
			},
			action: {},
			params: {
				b: 5
			}
		};
		let context = new Context(opts);

		expect(context.id).toBeDefined();
		expect(context.opts).toEqual(opts);
		expect(context.parent).toBeDefined();
		expect(context.service).toBeDefined();
		expect(context.action).toBeDefined();
		expect(context.broker).toBe(broker);
		expect(context.level).toBe(1);
		expect(context.params).toEqual({ b: 5 });

		// Test call method
		broker.call = jest.fn();

		let p = { id: 5 };
		context.call("posts.find", p);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, context);

		// Test emit method
		broker.emit = jest.fn();

		let data = { id: 5 };
		context.emit("request.rest", data);

		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", data);

		broker.emit.mockClear();
		context.emit("request.rest", "string-data");
		expect(broker.emit).toHaveBeenCalledTimes(1);
		expect(broker.emit).toHaveBeenCalledWith("request.rest", "string-data");
		
	});
});

describe("Test Child Context", () => {

	let parentCtx = new Context();

	let ctx = new Context({
		parent: parentCtx
	});

	it("test duration", () => {

		expect(ctx.parent).toBe(parentCtx);
		expect(parentCtx.duration).toBe(0);
		expect(ctx.duration).toBe(0);

		return new Promise((resolve) => {
			setTimeout(() => {
				ctx.closeContext();

				expect(ctx.stopTime).toBeGreaterThan(0);
				expect(ctx.duration).toBeGreaterThan(0);
				expect(parentCtx.duration).toBe(ctx.duration);

				resolve();
			}, 100);
			
		});

	});

});


describe("Test createSubContext", () => {

	let broker = new ServiceBroker();

	let opts = {
		id: 123,
		parent: {},
		service: {
			broker: broker
		},
		action: {},
		params: {
			b: 5
		}
	};
	let ctx = new Context(opts);

	it("test with empty params", () => {
		let subCtx = ctx.createSubContext();
		expect(subCtx).not.toBe(ctx);
		expect(subCtx.id).toBe(ctx.id);
		expect(subCtx.parent).toBe(ctx);
		expect(subCtx.service).toBe(ctx.service);
		expect(subCtx.action).toBe(ctx.action);
		expect(subCtx.params).toBeNull;
	});

	it("test with params", () => {
		let service2 = {
			broker: broker
		};
		let action2 = {};
		let params2 = { a: 11 };

		let subCtx = ctx.createSubContext(service2, action2, params2);
		expect(subCtx).not.toBe(ctx);
		expect(subCtx.id).toBe(ctx.id);
		expect(subCtx.parent).toBe(ctx);
		expect(subCtx.service).toBe(service2);
		expect(subCtx.action).toBe(action2);
		expect(subCtx.params).toEqual(params2);
	});

});

describe("Test result method", () => {
	let ctx = new Context();
	ctx.log =  jest.fn();
	ctx.closeContext =  jest.fn();

	it("should call closeContext method and call then", () => {
		let response = { id: 5 };
		let p = ctx.result(response);
		expect(p).toBeDefined();
		expect(p.then).toBeDefined();
		return p.then((data) => {
			expect(ctx.closeContext).toHaveBeenCalledTimes(1);
			expect(data).toBe(response);
		});
	});

});

describe("Test error method", () => {
	let ctx = new Context();
	ctx.log =  jest.fn();
	ctx.closeContext = jest.fn();

	it("should call closeContext method and call the catch", () => {
		let error = new Error("Wrong things!");
		let p = ctx.error(error);
		expect(p).toBeDefined();
		expect(p.catch).toBeDefined();
		return p.catch((err) => {
			expect(ctx.closeContext).toHaveBeenCalledTimes(1);
			expect(err).toBe(error);
		});
	});

});
