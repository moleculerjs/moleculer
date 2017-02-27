const ServiceBroker = require("../../src/service-broker");
const Context = require("../../src/context");
const Validator = require("../../src/validator");
const { ValidationError } = require("../../src/errors");

describe("Test Validator", () => {

	it("check constructor", () => {
		let v = new Validator();
		expect(v).toBeDefined();
	});

	it("check init", () => {
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
		let schema = {
			id: "required|numeric",
			name: "required|string"
		};

		let v = new Validator();
		let res = v.validate(schema, {
			id: 5,
			name: "Bob"
		});

		expect(res).toBe(true);
	});

	it("should throw ValidationError if object is NOT valid", () => {
		let schema = {
			id: "required|numeric",
			name: "required|string"
		};

		expect(() => {
			let v = new Validator();
			v.validate(schema, {
				id: "aa",
				name: "Bob"
			});

		}).toThrow(ValidationError);
	});	

});

describe("Test middleware", () => {
	let broker = new ServiceBroker();
	let v = new Validator();
	v.validate = jest.fn();

	let params = { id: 3, name: "Antsa" };

	it("should call validate & handler because the params is valid", () => {
		let mockAction = {
			name: "posts.find",
			params: {
				id: "required|numeric",
				name: "required|string"
			},
			handler: jest.fn()
		};
		
		let wrapped = v.middleware()(mockAction.handler, mockAction);
		expect(typeof wrapped).toBe("function");

		let ctx = new Context({ params, service: { broker } });
		wrapped(ctx);

		expect(v.validate).toHaveBeenCalledTimes(1);
		expect(v.validate).toHaveBeenCalledWith({"id": "required|numeric", "name": "required|string"}, {"id": 3, "name": "Antsa"});
		//expect(mockAction.handler).toHaveBeenCalledTimes(1);
		
	});

	it("should call handler because the params is NOT exist", () => {
		v.validate.mockClear();
		let mockAction = {
			name: "posts.find",
			handler: jest.fn()
		};
		
		let wrapped = v.middleware()(mockAction.handler, mockAction);
		expect(typeof wrapped).toBe("function");

		let ctx = new Context({ params, service: { broker } });
		wrapped(ctx);

		expect(v.validate).toHaveBeenCalledTimes(0);
		//expect(mockAction.handler).toHaveBeenCalledTimes(1);		
	});

});