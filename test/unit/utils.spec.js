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

describe("Test match", () => {

	expect(utils.match("1.2.3", "1.2.3")).toBe(true);
	expect(utils.match("a.b.c.d", "a.b.c.d")).toBe(true);
	expect(utils.match("aa.bb.cc", "aa.bb.cc")).toBe(true);

	expect(utils.match("a1c", "a?c")).toBe(true);
	expect(utils.match("a2c", "a?c")).toBe(true);
	expect(utils.match("a3c", "a?c")).toBe(true);
	expect(utils.match("ac", "a?c")).toBe(false);

	expect(utils.match("aa.1b.c", "aa.?b.*")).toBe(true);
	expect(utils.match("aa.2b.cc", "aa.?b.*")).toBe(true);
	expect(utils.match("aa.3b.ccc", "aa.?b.*")).toBe(true);
	expect(utils.match("aa.4b.cccc", "aa.?b.*")).toBe(true);
	expect(utils.match("aa.5b.ccccc", "aa.?b.*")).toBe(true);
	expect(utils.match("aa.5b.ccccc.d", "aa.?b.*")).toBe(false);

	expect(utils.match("aa.bb.cc", "aa.bb.*")).toBe(true);
	expect(utils.match("aa.bb.cc", "*.bb.*")).toBe(true);
	expect(utils.match("bb.cc", "bb.*")).toBe(true);
	expect(utils.match("dd", "*")).toBe(true);

	expect(utils.match("abcd", "*d")).toBe(true);
	expect(utils.match("abcd", "*d*")).toBe(true);
	expect(utils.match("abcd", "*a*")).toBe(true);
	expect(utils.match("abcd", "a*")).toBe(true);

	// --- DOUBLE STARS CASES ---

	expect(utils.match("aa.bb.cc", "aa.*")).toBe(false);
	expect(utils.match("aa.bb.cc", "a*")).toBe(false);
	expect(utils.match("bb.cc", "*")).toBe(false);

	expect(utils.match("aa.bb.cc.dd", "*.bb.*")).toBe(false);
	expect(utils.match("aa.bb.cc.dd", "*.cc.*")).toBe(false);

	expect(utils.match("aa.bb.cc.dd", "*bb*")).toBe(false);
	expect(utils.match("aa.bb.cc.dd", "*cc*")).toBe(false);

	expect(utils.match("aa.bb.cc.dd", "*b*")).toBe(false);
	expect(utils.match("aa.bb.cc.dd", "*c*")).toBe(false);

	expect(utils.match("aa.bb.cc.dd", "**.bb.**")).toBe(true);
	expect(utils.match("aa.bb.cc.dd", "**.cc.**")).toBe(true);

	expect(utils.match("aa.bb.cc.dd", "**aa**")).toBe(true);
	expect(utils.match("aa.bb.cc.dd", "**bb**")).toBe(true);
	expect(utils.match("aa.bb.cc.dd", "**cc**")).toBe(true);
	expect(utils.match("aa.bb.cc.dd", "**dd**")).toBe(true);

	expect(utils.match("aa.bb.cc.dd", "**b**")).toBe(true);
	expect(utils.match("aa.bb.cc.dd", "**c**")).toBe(true);

	expect(utils.match("aa.bb.cc", "aa.**")).toBe(true);
	expect(utils.match("aa.bb.cc", "**.cc")).toBe(true);

	expect(utils.match("bb.cc", "**")).toBe(true);
	expect(utils.match("b", "**")).toBe(true);

	expect(utils.match("$node.connected", "$node.*")).toBe(true);
	expect(utils.match("$node.connected", "$node.**")).toBe(true);
	expect(utils.match("$aa.bb.cc", "$aa.*.cc")).toBe(true);

	// ---
	expect(utils.match("$aa.bb.cc", "$aa.*.cc")).toBe(true);
	expect(utils.match("$aa.bb.cc", "$aa.**")).toBe(true);
	expect(utils.match("$aa.bb.cc", "$aa.**.cc")).toBe(true);
	expect(utils.match("$aa.bb.cc", "$aa.??.cc")).toBe(true);
	expect(utils.match("$aa.bb.cc", "?aa.bb.cc")).toBe(true);
	expect(utils.match("$aa.bb.cc", "aa.bb.cc")).toBe(false);
	expect(utils.match("$aa.bb.cc", "**.bb.cc")).toBe(true);
	expect(utils.match("$aa.bb.cc", "**.cc")).toBe(true);
	expect(utils.match("$aa.bb.cc", "**")).toBe(true);
	expect(utils.match("$aa.bb.cc", "*")).toBe(false);
});

describe("Test utils.safetyObject", () => {

	it("should return a same object", () => {
		const obj = {
			a: 5,
			b: "Hello",
			c: [0,1,2],
			d: {
				e: false,
				f: 1.23
			}
		};
		const res = utils.safetyObject(obj);
		expect(res).not.toBe(obj);
		expect(res).toEqual(obj);
	});

	it("should return a same object without circular refs & Function", () => {
		const obj = {
			a: 5,
			b: "Hello",
			c: [0,1,2],
			d: {
				e: false,
				f: 1.23
			},
			h: (ctx) => ctx
		};
		obj.d.g = obj;

		const res = utils.safetyObject(obj);
		expect(res).not.toBe(obj);
		expect(res).toEqual({
			a: 5,
			b: "Hello",
			c: [0,1,2],
			d: {
				e: false,
				f: 1.23
			}
		});

		expect(obj.d.g).toBeDefined();
		expect(obj.h).toBeInstanceOf(Function);
	});

});

describe("Test utils.dotSet", () => {

	it("should set variable", () => {
		const obj = {};
		const result = utils.dotSet(obj, "variable", "hello world");
		expect(result.variable).toBe("hello world");
	});

	it("should set nested variable", () => {
		const obj = {};
		const result = utils.dotSet(obj, "nested.variable", "hello world");
		expect(result.nested.variable).toBe("hello world");
	});
	
	it("should not change other variables", () => {
		const obj = {
			a: 1,
			b: {
				c: 2,
			},
		};
		const result = utils.dotSet(obj, "nested.variable", "hello world");
		expect(result.a).toBe(1);
		expect(result.b.c).toBe(2);
		expect(result.nested.variable).toBe("hello world");
	});
	
	it("should replace values", () => {
		const obj = {
			hello: {
				world: "!",
			},
		};
		const result = utils.dotSet(obj, "hello.world", "?");
		expect(result.hello.world).toBe("?");
	});
	
	it("should throw when not on leaf", (done) => {
		const obj = {
			level1: {
				level2: "hello",
			},
		};
		try {
			utils.dotSet(obj, "level1.level2.level3", "?");
			done.fail(new Error("Should have raised an error"));
		} catch(err) {
			done();
		}
	});
	
});
