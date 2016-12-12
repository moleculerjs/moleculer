"use strict";

let _ = require("lodash");
let bus = require("../src/service-bus");
let Context = require("../src/context");
let ServiceBroker = require("../src/service-broker");

describe("Test Context", () => {

	it("test with empty opts", () => {

		let context = new Context();

		expect(context.id).toBeDefined();
		expect(context.parent).not.toBeDefined();
		expect(context.service).not.toBeDefined();
		expect(context.action).not.toBeDefined();
		expect(context.broker).not.toBeDefined();
		expect(context.level).toBe(1);
		expect(context.params).toBeDefined();
		expect(context.params).toEqual({});

		expect(context.startTime).toBeDefined();
		expect(context.stopTime).toBeNull();

		let params = {
			a: 1
		};

		context.setParams(params);
		expect(context.params).toEqual(params);		
	});

	it("test with options", () => {

		let broker = new ServiceBroker();

		let context = new Context({
			id: 123,
			parent: {},
			service: {
				$broker: broker
			},
			action: {},
			level: 3,
			params: {
				b: 5
			}
		});

		expect(context.id).toBeDefined();
		expect(context.parent).toBeDefined();
		expect(context.service).toBeDefined();
		expect(context.action).toBeDefined();
		expect(context.broker).toBe(broker);
		expect(context.level).toBe(4);
		expect(context.params).toEqual({ b: 5 });

		// Test call method
		broker.call = jest.fn();

		let p = { id: 5 };
		context.call("posts.find", p);

		expect(broker.call).toHaveBeenCalledTimes(1);
		expect(broker.call).toHaveBeenCalledWith("posts.find", p, context);

		// Test emit method
		bus.emit = jest.fn();

		let data = { id: 5 };
		context.emit("request.rest", data);

		expect(bus.emit).toHaveBeenCalledTimes(1);
		expect(bus.emit).toHaveBeenCalledWith("request.rest", data);

		bus.emit.mockClear();
		context.emit("request.rest", "string-data");
		expect(bus.emit).toHaveBeenCalledTimes(1);
		expect(bus.emit).toHaveBeenCalledWith("request.rest", "string-data");
		
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
