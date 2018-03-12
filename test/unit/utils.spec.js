const utils = require("../../src/utils");


describe("Test utils.generateToken", () => {

	it("should generate unique token", () => {
		let res1 = utils.generateToken();
		expect(res1).toBeDefined();
		expect(res1.length).toBe(36);

		let res2 = utils.generateToken();
		expect(res2).toBeDefined();
		expect(res1).not.toEqual(res2);
	});

});


describe("Test utils.isPromise", () => {

	it("should check the param", () => {
		expect(utils.isPromise()).toBe(false);
		expect(utils.isPromise({})).toBe(false);
		expect(utils.isPromise(new Promise(() => {}))).toBe(true);
		expect(utils.isPromise(Promise.resolve())).toBe(true);
		//expect(utils.isPromise(Promise.reject())).toBe(true); // node gives warning
	});

});

describe("Test utils.getNodeID", () => {
	let os = require("os");
	it("should give the computer hostname", () => {
		expect(utils.getNodeID()).toBe(os.hostname().toLowerCase() + "-" + process.pid);
	});
});

