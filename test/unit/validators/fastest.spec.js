"use strict";

const FastestValidator = require("../../../src/validators").Fastest;
const ServiceBroker = require("../../../src/service-broker");
const { ValidationError } = require("../../../src/errors");
const { protectReject } = require("../utils");

describe("Test FastestValidator constructor", () => {

	const broker = new ServiceBroker({ logger: false });

	it("test constructor without opts", () => {
		const validator = new FastestValidator();

		expect(validator).toBeDefined();
		expect(validator.opts).toEqual({ paramName: "params" });
	});

	it("test constructor with opts", () => {
		const validator = new FastestValidator({
			useNewCustomCheckerFunction: true
		});

		expect(validator).toBeDefined();
		expect(validator.opts).toEqual({
			paramName: "params",
			useNewCustomCheckerFunction: true
		});
	});

});

describe("Test FastestValidator 'init' method", () => {

	it("should set broker", () => {
		const broker = new ServiceBroker({ logger: false });

		const validator = new FastestValidator();

		validator.init(broker);

		expect(validator.broker).toBe(broker);
	});
});

describe("Test Validator.compile", () => {

	const v = new FastestValidator();
	v.validator.compile = jest.fn(() => true);

	it("should call parent compile", () => {
		v.compile({});

		expect(v.validator.compile).toHaveBeenCalledTimes(1);
	});

});

describe("Test Validator.validate", () => {

	const v = new FastestValidator();
	v.validator.validate = jest.fn(() => true);

	it("should call parent validate", () => {
		v.validate({}, {});

		expect(v.validator.validate).toHaveBeenCalledTimes(1);
	});

	it("should throw ValidationError if object is NOT valid", () => {
		const v = new FastestValidator();
		v.validator.validate = jest.fn(() => []);
		expect(() => {
			v.validate({}, {});

		}).toThrow(ValidationError);
	});
});

describe("Test Validator.convertSchemaToMoleculer", () => {
	const v = new FastestValidator();

	it("should return one-to-one", () => {
		const obj = { a: 5 };

		expect(v.convertSchemaToMoleculer(obj)).toBe(obj);
	});
});

describe("Test Validator with context", () => {

	const broker = new ServiceBroker({ logger: false });
	broker.createService({
		name: "test",
		actions: {
			withCustomValidation: {
				params: {
					c: {
						type: "string",
						messages: {
							isTest: "The 'meta.isTest' field is required."
						},
						custom: (value, schema, path, parent, context) => {
							const { meta: ctx } = context;
							if (!(ctx && "meta" in ctx && "isTest" in ctx.meta)) {
								return [
									{
										type: "isTest",
										actual: undefined,
									}
								];
							}
							return value;
						}
					}
				},
				handler: jest.fn(() => 123)
			}
		}
	});

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should validate with meta", () => {
		return broker.call("test.withCustomValidation", { c: "asd" }, { meta: { isTest: true } })
			.catch(protectReject)
			.then(res => {
				expect(res).toEqual(123);
			});
	});

	it("should throw ValidationError without meta", () => {
		return broker.call("test.withCustomValidation", { c: "asd" }).then(protectReject).catch(err => {
			expect(err).toBeInstanceOf(ValidationError);
			expect(err.data).toEqual([{
				action: "test.withCustomValidation",
				actual: undefined,
				field: "c",
				message: "The 'meta.isTest' field is required.",
				nodeID: broker.nodeID,
				type: "isTest"
			}]);
		});
	});
});
