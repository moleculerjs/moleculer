const utils = require("../src/utils");

describe("Test utils", () => {

	it("utils.add", () => {
		expect(utils.add(1, 2)).toBe(3);
		expect(utils.add(2, 2)).toBe(4);
	});

	it("utils.sub", () => {
		expect(utils.sub(5, 2)).toBe(3);
		expect(utils.sub(4, 2)).toBe(2);
	});

});
