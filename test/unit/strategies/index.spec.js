const { BrokerOptionsError } = require("../../../src/errors");
const Strategies = require("../../../src/strategies");

describe("Test Strategies resolver", () => {

	it("should resolve null from undefined", () => {
		let Strategy = Strategies.resolve();
		expect(Strategy).toBe(Strategies.RoundRobin);
	});

	it("should resolve RoundRobinStrategy from obj without type", () => {
		let Strategy = Strategies.resolve({});
		expect(Strategy).toBe(Strategies.RoundRobin);
	});

	it("should resolve RoundRobinStrategy from obj", () => {
		let Strategy = Strategies.resolve({ type: "random" });
		expect(Strategy).toBe(Strategies.Random);

		Strategy = Strategies.resolve({ type: "Random" });
		expect(Strategy).toBe(Strategies.Random);
	});

	it("should resolve RandomStrategy from string with 'random' and 'Random' type", () => {
		let Strategy = Strategies.resolve("random");
		expect(Strategy).toBe(Strategies.Random);

		Strategy = Strategies.resolve("Random");
		expect(Strategy).toBe(Strategies.Random);
	});

	it("should throw error if type if not correct", () => {
		expect(() => {
			Strategies.resolve("xyz");
		}).toThrowError(BrokerOptionsError);

		expect(() => {
			Strategies.resolve({ type: "xyz" });
		}).toThrowError(BrokerOptionsError);
	});

});


describe("Test Strategies register", () => {
	class MyCustom {}

	it("should throw error if type if not correct", () => {
		expect(() => {
			Strategies.resolve("MyCustom");
		}).toThrowError(BrokerOptionsError);
	});

	it("should register new type", () => {
		Strategies.register("MyCustom", MyCustom);
		expect(Strategies.MyCustom).toBe(MyCustom);
	});

	it("should find the new type", () => {
		const strategy = Strategies.resolve("MyCustom");
		expect(strategy).toBe(MyCustom);
	});
});
