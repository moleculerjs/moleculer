const { MoleculerError } = require("../../../src/errors");
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
		}).toThrowError(MoleculerError);

		expect(() => {
			Strategies.resolve({ type: "xyz" });
		}).toThrowError(MoleculerError);
	});

});
