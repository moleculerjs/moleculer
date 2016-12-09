const utils = require("../src/utils");

describe("Test utils", () => {

	it("utils.generateToken", () => {
		let res = utils.generateToken();
		expect(res).toBeDefined();
	});

});
