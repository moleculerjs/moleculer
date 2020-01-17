"use strict";

const { ServiceBroker, Context } = require("../../");
const { ValidationError } = require("../../").Errors;
const TestService = require("./sample.service");

describe("Test 'greeter' service", () => {
	describe("Test actions", () => {
		const broker = new ServiceBroker({ logger: false });
		const svc = broker.createService(TestService);

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		describe("Test 'greeter.hello' action", () => {

			it("should return with 'Hello Moleculer'", async () => {
				expect(await broker.call("greeter.hello")).toBe("Hello Moleculer");
			});

		});

		describe("Test 'greeter.welcome' action", () => {

			it("should return with 'Welcome'", async () => {
				expect(await broker.call("greeter.welcome", { name: "Adam" })).toBe("Welcome, Adam");
			});

			it("should reject an ValidationError", async () => {
				expect.assertions(1);
				try {
					await broker.call("greeter.welcome");
				} catch(err) {
					expect(err).toBeInstanceOf(ValidationError);
				}
			});

		});
	});

	describe("Test events", () => {
		const broker = new ServiceBroker({ logger: false });
		const svc = broker.createService(TestService);

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		describe("Test 'user.created' event", () => {
			beforeAll(() => {
				svc.myMethod = jest.fn();
				svc.myMethod2 = jest.fn();
			});
			afterAll(() => {
				svc.myMethod.mockRestore();
				svc.myMethod2.mockRestore();
			});

			it("should call both myMethod", async () => {
				//await broker.emit("branch.closed");
				await svc.emitLocalEventHandler("user.created", { a: 5 });

				expect(svc.myMethod).toBeCalledTimes(1);
				expect(svc.myMethod).toBeCalledWith({ a: 5 });

				expect(svc.myMethod2).toBeCalledTimes(1);
				expect(svc.myMethod2).toBeCalledWith({ a: 5 });
			});

		});
	});

});

