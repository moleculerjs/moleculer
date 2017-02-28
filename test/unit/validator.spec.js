const ServiceBroker = require("../../src/service-broker");
const Validator = require("../../src/validator");
const { ValidationError } = require("../../src/errors");

jest.mock("validatorjs");

let ValidatorJS = require("validatorjs");
ValidatorJS.mockImplementation((obj, schema) => {
	return {
		passes: jest.fn(() => schema != null),
		errors: {
			all: jest.fn(() => "Not valid!")
		}
	};
});

// Unit: OK!
describe("Test constructor", () => {

	it("should create instance", () => {
		let v = new Validator();
		expect(v).toBeDefined();
	});

	it("should register itself as middleware", () => {
		let broker = new ServiceBroker();
		broker.use = jest.fn();
		let v = new Validator();

		v.init(broker);
		expect(v.broker).toBe(broker);
		expect(broker.use).toHaveBeenCalledTimes(1);
	});
});

describe("Test Validator.validate", () => {

	it("should return true if object is valid", () => {
		let v = new Validator();
		let res = v.validate({}, {});
		expect(res).toBe(true);
	});

	it("should throw ValidationError if object is NOT valid", () => {
		expect(() => {
			let v = new Validator();
			v.validate(null, {});

		}).toThrow(ValidationError);
	});	

});

describe("Test middleware", () => {
	let v = new Validator();
	v.validate = jest.fn();

	it("should return a middleware function", () => {
		let mw = v.middleware();
		expect(mw).toBeInstanceOf(Function);
	});

	it("should return a middleware function", () => {
		let mw = v.middleware();

		let mockAction = {
			name: "posts.find",
			params: {
				id: "required|numeric",
				name: "required|string"
			},
			handler: jest.fn()
		};
		
		// Create wrapped handler
		let wrapped = mw(mockAction.handler, mockAction);
		expect(typeof wrapped).toBe("function");

		// Create fake context
		let ctx = { params: { id: 5, name: "John" } };

		// Call wrapped function
		return wrapped(ctx).then(() => {
			expect(v.validate).toHaveBeenCalledTimes(1);
			expect(v.validate).toHaveBeenCalledWith({"id": "required|numeric", "name": "required|string"}, {"id": 5, "name": "John"});
			expect(mockAction.handler).toHaveBeenCalledTimes(1);		
		});
	});

	it("should call handler because the params is NOT exist", () => {
		v.validate.mockClear();
		let mockAction = {
			name: "posts.find",
			handler: jest.fn()
		};
		
		let wrapped = v.middleware()(mockAction.handler, mockAction);
		expect(typeof wrapped).toBe("function");

		let ctx = { params: { id: 5, name: "John" } };
		wrapped(ctx);

		expect(v.validate).toHaveBeenCalledTimes(0);
		expect(mockAction.handler).toHaveBeenCalledTimes(1);		
	});

});