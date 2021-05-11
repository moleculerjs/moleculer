"use strict";

const BaseValidator = require("../../../src/validators").Base;
const ServiceBroker = require("../../../src/service-broker");
const { ValidationError } = require("../../../src/errors");

describe("Test BaseValidator constructor", () => {

	const broker = new ServiceBroker({ logger: false });

	it("test constructor without opts", () => {
		const validator = new BaseValidator();

		expect(validator).toBeDefined();
		expect(validator.opts).toEqual({
			paramName: "params"
		});
	});

	it("test constructor with opts", () => {
		const validator = new BaseValidator({
			paramName: "myParam",
			useNewCustomCheckerFunction: true
		});

		expect(validator).toBeDefined();
		expect(validator.opts).toEqual({
			paramName: "myParam",
			useNewCustomCheckerFunction: true
		});
	});

});

describe("Test BaseValidator 'init' method", () => {

	it("should set broker", () => {
		const broker = new ServiceBroker({ logger: false });

		const validator = new BaseValidator();

		validator.init(broker);

		expect(validator.broker).toBe(broker);
	});
});

describe("Test BaseValidator 'middleware' method", () => {
	const broker = new ServiceBroker({ logger: false });

	describe("Test middleware localAction", () => {
		const v = new BaseValidator();
		const checkGood = jest.fn(() => true);
		const checkBad = jest.fn(() => [{ type: "required", field: "any" }]);
		v.init(broker);

		it("should return a middleware object", () => {
			const mw = v.middleware();
			expect(mw).toEqual({
				name: "Validator",
				localAction: expect.any(Function),
				localEvent: expect.any(Function),
			});
		});

		it("should wrap the handler", () => {
			const mw = v.middleware(broker);

			const mockAction = {
				name: "posts.find",
				params: {
					id: "number",
					name: "string"
				},
				handler: jest.fn(() => Promise.resolve())
			};
			v.compile = jest.fn(() => checkGood);

			// Create wrapped handler
			const wrapped = mw.localAction(mockAction.handler, mockAction);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).not.toBe(mockAction.handler);

			expect(v.compile).toHaveBeenCalledTimes(1);
			expect(v.compile).toHaveBeenCalledWith({ "id": "number", "name": "string" });

			// Create fake context
			const ctx = { params: { id: 5, name: "John" } };

			// Call wrapped function
			return wrapped(ctx).then(() => {
				expect(checkGood).toHaveBeenCalledTimes(1);
				expect(checkGood).toHaveBeenCalledWith(ctx.params, { meta: ctx });
				expect(mockAction.handler).toHaveBeenCalledTimes(1);
			});
		});

		it("should call validator & throw error & not call handler", () => {
			const mw = v.middleware(broker);

			const mockAction = {
				name: "posts.find",
				params: {
					id: "number",
					name: "string"
				},
				handler: jest.fn(() => Promise.resolve())
			};
			v.compile = jest.fn(() => checkBad);

			// Create wrapped handler
			const wrapped = mw.localAction(mockAction.handler, mockAction);
			expect(wrapped).not.toBe(mockAction.handler);
			// Create fake context with wrong params
			const ctx = { params: { id: 5, fullName: "John" }, action: mockAction };

			// Call wrapped function
			return wrapped(ctx).catch(err => {
				expect(err).toBeInstanceOf(ValidationError);
				expect(err.data).toEqual([
					{ "action": "posts.find", "field": "any", "nodeID": undefined, "type": "required" }
				]);
				expect(mockAction.handler).toHaveBeenCalledTimes(0);
			});
		});

		it("should not wrap handler because the params is NOT exist", () => {
			const mockAction = {
				name: "posts.find",
				handler: jest.fn()
			};

			const wrapped = v.middleware().localAction(mockAction.handler, mockAction);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).toBe(mockAction.handler);
		});

	});

	describe("Test middleware localAction with custom paramName", () => {
		const v = new BaseValidator({ paramName: "paramValidation" });
		const checkGood = jest.fn(() => true);
		const checkBad = jest.fn(() => [{ type: "required", field: "any" }]);
		v.init(broker);

		it("should wrap the handler", () => {
			const mw = v.middleware(broker);

			const mockAction = {
				name: "posts.find",
				paramValidation: {
					id: "number",
					name: "string"
				},
				handler: jest.fn(() => Promise.resolve())
			};
			v.compile = jest.fn(() => checkGood);

			// Create wrapped handler
			const wrapped = mw.localAction(mockAction.handler, mockAction);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).not.toBe(mockAction.handler);

			expect(v.compile).toHaveBeenCalledTimes(1);
			expect(v.compile).toHaveBeenCalledWith({ "id": "number", "name": "string" });

			// Create fake context
			const ctx = { params: { id: 5, name: "John" } };

			// Call wrapped function
			return wrapped(ctx).then(() => {
				expect(checkGood).toHaveBeenCalledTimes(1);
				expect(checkGood).toHaveBeenCalledWith(ctx.params, { meta: ctx });
				expect(mockAction.handler).toHaveBeenCalledTimes(1);
			});
		});

		it("should not wrap handler because the params is NOT exist", () => {
			const mockAction = {
				name: "posts.find",
				params: {
					id: "number",
					name: "string"
				},
				handler: jest.fn()
			};

			const wrapped = v.middleware().localAction(mockAction.handler, mockAction);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).toBe(mockAction.handler);
		});

	});

	describe("Test middleware localEvent", () => {
		const v = new BaseValidator();
		v.init(broker);
		const checkGood = jest.fn(() => true);
		const checkBad = jest.fn(() => [{ type: "required", field: "any" }]);

		it("should return a middleware object", () => {
			const mw = v.middleware();
			expect(mw).toEqual({
				name: "Validator",
				localAction: expect.any(Function),
				localEvent: expect.any(Function),
			});
		});

		it("should call validator & handler", () => {
			const mw = v.middleware(broker);

			const mockEvent = {
				name: "posts.find",
				params: {
					id: "number",
					name: "string"
				},
				handler: jest.fn(() => Promise.resolve())
			};
			v.compile = jest.fn(() => checkGood);

			// Create wrapped handler
			const wrapped = mw.localEvent(mockEvent.handler, mockEvent);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).not.toBe(mockEvent.handler);

			expect(v.compile).toHaveBeenCalledTimes(1);
			expect(v.compile).toHaveBeenCalledWith({ "id": "number", "name": "string" });

			// Create fake context
			const ctx = { params: { id: 5, name: "John" } };

			// Call wrapped function
			return wrapped(ctx).then(() => {
				expect(checkGood).toHaveBeenCalledTimes(1);
				expect(checkGood).toHaveBeenCalledWith(ctx.params, { meta: ctx });
				expect(mockEvent.handler).toHaveBeenCalledTimes(1);
			});
		});

		it("should call validator & throw error & not call handler", () => {
			const mw = v.middleware(broker);

			const mockEvent = {
				name: "posts.find",
				params: {
					id: "number",
					name: "string"
				},
				handler: jest.fn(() => Promise.resolve())
			};
			v.compile = jest.fn(() => checkBad);

			// Create wrapped handler
			const wrapped = mw.localEvent(mockEvent.handler, mockEvent);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).not.toBe(mockEvent.handler);
			// Create fake context with wrong params
			const ctx = { params: { id: 5, fullName: "John" }, event: mockEvent };

			// Call wrapped function
			return wrapped(ctx).catch(err => {
				expect(err).toBeInstanceOf(ValidationError);
				expect(mockEvent.handler).toHaveBeenCalledTimes(0);
			});
		});

		it("should call handler because the params is NOT exist", () => {
			const mockEvent = {
				name: "posts.find",
				handler: jest.fn()
			};

			const wrapped = v.middleware().localEvent(mockEvent.handler, mockEvent);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).toBe(mockEvent.handler);
		});

	});

	describe("Test middleware localEvent with custom paramName", () => {
		const v = new BaseValidator({ paramName: "paramValidation" });
		v.init(broker);
		const checkGood = jest.fn(() => true);
		const checkBad = jest.fn(() => [{ type: "required", field: "any" }]);

		it("should call validator & handler", () => {
			const mw = v.middleware(broker);

			const mockEvent = {
				name: "posts.find",
				paramValidation: {
					id: "number",
					name: "string"
				},
				handler: jest.fn(() => Promise.resolve())
			};
			v.compile = jest.fn(() => checkGood);

			// Create wrapped handler
			const wrapped = mw.localEvent(mockEvent.handler, mockEvent);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).not.toBe(mockEvent.handler);

			expect(v.compile).toHaveBeenCalledTimes(1);
			expect(v.compile).toHaveBeenCalledWith({ "id": "number", "name": "string" });

			// Create fake context
			const ctx = { params: { id: 5, name: "John" } };

			// Call wrapped function
			return wrapped(ctx).then(() => {
				expect(checkGood).toHaveBeenCalledTimes(1);
				expect(checkGood).toHaveBeenCalledWith(ctx.params, { meta: ctx });
				expect(mockEvent.handler).toHaveBeenCalledTimes(1);
			});
		});


		it("should call handler because the params is NOT exist", () => {
			const mockEvent = {
				name: "posts.find",
				params: {
					id: "number",
					name: "string"
				},
				handler: jest.fn()
			};

			const wrapped = v.middleware().localEvent(mockEvent.handler, mockEvent);
			expect(typeof wrapped).toBe("function");
			expect(wrapped).toBe(mockEvent.handler);
		});

	});

});

