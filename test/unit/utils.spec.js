const utils = require("../../src/utils");

// Unit: OK!
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
		expect(utils.getNodeID()).toBe(os.hostname().toLowerCase());
	});
});

describe("Test utils.string2Json", () => {
	let str = '{"a": 1, "b": [1,5,8], "c": "Test" }';
	it("should give JS object", () => {
		expect(utils.string2Json()).toBeNull();
		expect(utils.string2Json("")).toBeNull();
		expect(utils.string2Json(str)).toEqual({
			a: 1, 
			b: [1,5,8],
			c: "Test"
		});
	});
});

describe("Test utils.json2String", () => {
	let str = '{"a":1,"b":[1,5,8],"c":"Test"}';
	let obj = {
		a: 1, 
		b: [1,5,8],
		c: "Test"
	};

	it("should give JSON string", () => {
		expect(utils.json2String()).toBe("");
		expect(utils.json2String(null)).toBe("");
		expect(utils.json2String(obj)).toBe(str);
	});
});
