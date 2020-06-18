const { BrokerOptionsError } = require("../../../src/errors");
const Validators = require("../../../src/validators");

describe("Test Validators resolver", () => {

	it("should resolve default Fastest discoverer", () => {
		const discoverer = Validators.resolve();
		expect(discoverer).toBeInstanceOf(Validators.Fastest);
	});

	it("should resolve Fastest reporter from string", () => {
		const discoverer = Validators.resolve("Fastest");
		expect(discoverer).toBeInstanceOf(Validators.Fastest);
	});

	it("should resolve Fastest discoverer from obj", () => {
		const options = { messages: { a: 5 } };
		const discoverer = Validators.resolve({ type: "Fastest", options });
		expect(discoverer).toBeInstanceOf(Validators.Fastest);
		expect(discoverer.opts).toEqual(expect.objectContaining({ messages: { a: 5 } }));
	});

	it("should resolve Fastest discoverer from instance", () => {
		const instance = new Validators.Fastest();
		const discoverer = Validators.resolve(instance);
		expect(discoverer).toBe(instance);
	});

	it("should throw error if not found by name", () => {
		expect(() => Validators.resolve("xyz")).toThrowError(BrokerOptionsError);
		expect(() => Validators.resolve({ type: "xyz" })).toThrowError(BrokerOptionsError);
	});
});
