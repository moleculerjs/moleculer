const utils = require("../../src/utils");
const { protectReject } = require("./utils");
const lolex = require("@sinonjs/fake-timers");


describe("Test utils.isObject", () => {

	it("should return true for POJOs and Arrays and false for anything else", () => {
		expect(utils.isObject({})).toBe(true);
		expect(utils.isObject([])).toBe(true);

		expect(utils.isObject(null)).toBe(false);
		expect(utils.isObject(function() {})).toBe(false);
		expect(utils.isObject(()=>{})).toBe(false);
		expect(utils.isObject(async ()=>{})).toBe(false);
		expect(utils.isObject(class Dummy {})).toBe(false);
		expect(utils.isObject(1)).toBe(false);
		expect(utils.isObject("string")).toBe(false);
		expect(utils.isObject(NaN)).toBe(false);
	});
});

describe("Test utils.humanize", () => {

	it("should humanize elapsed milliseconds", () => {
		expect(utils.humanize()).toBe("?");
		expect(utils.humanize(1)).toBe("1ms");
		expect(utils.humanize(10)).toBe("10ms");
		expect(utils.humanize(100)).toBe("100ms");
		expect(utils.humanize(1000)).toBe("1s");
		expect(utils.humanize(10000)).toBe("10s");
		expect(utils.humanize(100000)).toBe("1m");
		expect(utils.humanize(1000000)).toBe("16m");
		expect(utils.humanize(10000000)).toBe("2h");
		expect(utils.humanize(100000000)).toBe("27h");

		expect(utils.humanize(0)).toBe("now");
		expect(utils.humanize(0.1)).toBe("100μs");
		expect(utils.humanize(0.01)).toBe("10μs");
		expect(utils.humanize(0.001)).toBe("1μs");
		expect(utils.humanize(0.0001)).toBe("100ns");
		expect(utils.humanize(0.00001)).toBe("10ns");
		expect(utils.humanize(0.000001)).toBe("1ns");
		expect(utils.humanize(0.0000001)).toBe("now");
	});

});

describe("Test utils.generateToken", () => {
	const REGEX_MATCHER = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

	it("should generate unique token", () => {
		let res1 = utils.generateToken();
		expect(res1.length).toBe(36);
		expect(res1).toMatch(REGEX_MATCHER);

		let res2 = utils.generateToken();
		expect(res2).toMatch(REGEX_MATCHER);
		expect(res1).not.toEqual(res2);
	});
});

describe("Test utils.removeFromArray", () => {

	it("should remove item from array", () => {
		expect(utils.removeFromArray()).toBeUndefined();
		expect(utils.removeFromArray([])).toEqual([]);

		expect(utils.removeFromArray([10,20,30,40,50,60], 80)).toEqual([10,20,30,40,50,60]);
		expect(utils.removeFromArray([10,20,30,40,50,60], 30)).toEqual([10,20,40,50,60]);

		const arr = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }];
		expect(utils.removeFromArray(arr, { a: 1 })).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]);
		expect(utils.removeFromArray(arr, arr[2])).toEqual([{ a: 1 }, { a: 2 }, { a: 4 }]);
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

describe("Test utils.getIpList", () => {
	let os = require("os");
	it("should give only IPv4 external interfaces", () => {
		os.networkInterfaces = jest.fn(() => ({
			"Loopback Pseudo-Interface 1": [
				{
					address: "::1",
					netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
					family: "IPv6",
					internal: true,
					cidr: "::1/128"
				},
				{
					address: "127.0.0.1",
					netmask: "255.0.0.0",
					family: "IPv4",
					internal: true,
					cidr: "127.0.0.1/8"
				}
			],
			"Local": [
				{
					address: "fe80::29a9:ffeb:4a65:9f82",
					netmask: "ffff:ffff:ffff:ffff::",
					family: "IPv6",
					internal: false,
					cidr: "fe80::29a9:ffeb:4a65:9f82/64"
				},
				{ address: "192.168.2.100",
					netmask: "255.255.255.0",
					family: "IPv4",
					internal: false,
					cidr: "192.168.2.100/24"
				}
			],
			"VMware Network Adapter VMnet1": [
				{
					address: "fe80::3c63:fab8:e6be:8059",
					netmask: "ffff:ffff:ffff:ffff::",
					family: "IPv6",
					internal: false,
					cidr: "fe80::3c63:fab8:e6be:8059/64"
				},
				{
					address: "192.168.232.1",
					netmask: "255.255.255.0",
					family: "IPv4",
					internal: false,
					cidr: "192.168.232.1/24"
				}
			]
		}));
		expect(utils.getIpList()).toEqual(["192.168.2.100", "192.168.232.1"]);
	});
	it("should give all IPv4 internal interfaces", () => {
		os.networkInterfaces = jest.fn(() => ({
			"Loopback Pseudo-Interface 1": [
				{
					address: "::1",
					netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
					family: "IPv6",
					internal: true,
					cidr: "::1/128"
				},
				{
					address: "127.0.0.1",
					netmask: "255.0.0.0",
					family: "IPv4",
					internal: true,
					cidr: "127.0.0.1/8"
				}
			],
			"Loopback Pseudo-Interface 2": [
				{
					address: "::2",
					netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
					family: "IPv6",
					internal: true,
					cidr: "::2/128"
				},
				{
					address: "127.0.0.2",
					netmask: "255.0.0.0",
					family: "IPv4",
					internal: true,
					cidr: "127.0.0.2/8"
				}
			],

		}));
		expect(utils.getIpList()).toEqual(["127.0.0.1","127.0.0.2"]);
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

	it("should skip converting into JSON large objects", () => {
		const bigData = Array.from({ length: 2048 }).map((_, index) => index);

		const bigBuffer = Buffer.from(bigData);
		const bigSet = new Set(bigData);
		const obj = {
			a: 5,
			b: "Hello",
			c: [0,1,2],
			d: {
				e: false,
				f: 1.23
			},
			bigBuffer,
			bigSet,
		};
		const res = utils.safetyObject(obj, { maxSafeObjectSize: 1024 });
		expect(res).not.toBe(obj);
		expect(res).toEqual({
			a: 5,
			b: "Hello",
			c: [0,1,2],
			d: {
				e: false,
				f: 1.23
			},
			bigBuffer: {
				data: "[Array 2048]",
				type: "Buffer",
			},
			bigSet: "[Set 2048]",
		});
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

	it("should set nested value if the current value is null", () => {
		const obj = {
			a: 1,
			b: null,
		};
		const result = utils.dotSet(obj, "b.c", "hello world");
		expect(result.a).toBe(1);
		expect(result.b.c).toBe("hello world");
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

describe("Test utils.parseByteString", () => {

	it("should parse byte string to number of bytes", () => {
		expect(utils.parseByteString()).toBe(null);
		expect(utils.parseByteString(null)).toBe(null);
		expect(utils.parseByteString(0)).toBe(0);
		expect(utils.parseByteString(1000)).toBe(1000);
		expect(utils.parseByteString(10000)).toBe(10000);
		expect(utils.parseByteString(100000000)).toBe(100000000);

		expect(utils.parseByteString("")).toBe(null);
		expect(utils.parseByteString("0")).toBe(0);
		expect(utils.parseByteString("1")).toBe(1);
		expect(utils.parseByteString("10")).toBe(10);
		expect(utils.parseByteString("100")).toBe(100);
		expect(utils.parseByteString("1000")).toBe(1000);
		expect(utils.parseByteString("a")).toBe(null);
		expect(utils.parseByteString("b")).toBe(null);
		expect(utils.parseByteString("B")).toBe(null);

		expect(utils.parseByteString("1b")).toBe(1);
		expect(utils.parseByteString("5B")).toBe(5);
		expect(utils.parseByteString("100b")).toBe(100);
		expect(utils.parseByteString("1000b")).toBe(1000);
		expect(utils.parseByteString("0kb")).toBe(0);
		expect(utils.parseByteString("1kb")).toBe(1024);
		expect(utils.parseByteString("100kb")).toBe(102400);
		expect(utils.parseByteString("512kb")).toBe(524288);
		expect(utils.parseByteString("1mb")).toBe(1048576);
		expect(utils.parseByteString("5mb")).toBe(5242880);
		expect(utils.parseByteString("2.56GB")).toBe(2748779069);
		expect(utils.parseByteString("2.8TB")).toBe(3078632557772);
	});

});


describe("Test utils.polyfillPromise", () => {

	it("should missing polyfilled methods", () => {
		expect(Promise.method).toBeUndefined();
		expect(Promise.delay).toBeUndefined();
		expect(Promise.prototype.delay).toBeUndefined();
		expect(Promise.prototype.timeout).toBeUndefined();
		expect(Promise.TimeoutError).toBeUndefined();
		//expect(Promise.map).toBeUndefined();
		//expect(Promise.mapSeries).toBeUndefined();
	});

	it("should exists polyfilled methods", () => {
		utils.polyfillPromise(global.Promise);

		expect(Promise.method).toBeDefined();
		expect(Promise.delay).toBeDefined();
		expect(Promise.prototype.delay).toBeDefined();
		expect(Promise.prototype.timeout).toBeDefined();
		expect(Promise.TimeoutError).toBeDefined();
		//expect(Promise.map).toBeDefined();
		//expect(Promise.mapSeries).toBeDefined();
	});

	describe("Test Promise.method", () => {

		it("should wrap a static value with Promise", () => {
			const origFn = name => `Hello ${name}`;
			const pFn = Promise.method(origFn);

			return pFn("Promise").catch(protectReject).then(res => {
				expect(res).toBe("Hello Promise");
			});
		});

		it("should wrap a resolved with value", () => {
			const origFn = name => Promise.resolve(`Hello ${name}`);
			const pFn = Promise.method(origFn);

			return pFn("Promise").catch(protectReject).then(res => {
				expect(res).toBe("Hello Promise");
			});
		});

		it("should wrap an Error with Promise", () => {
			const err = new Error("Something happened");
			const origFn = () => { throw err; };
			const pFn = Promise.method(origFn);

			return pFn("Promise").then(protectReject).catch(res => {
				expect(res).toBe(err);
			});
		});

		it("should wrap a rejected Error", () => {
			const err = new Error("Something happened");
			const origFn = () => Promise.reject(err);
			const pFn = Promise.method(origFn);

			return pFn("Promise").then(protectReject).catch(res => {
				expect(res).toBe(err);
			});
		});
	});

	describe.skip("Test Promise.delay", () => {
		let clock;

		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());

		it("should wait the given time", () => {
			let done = false;
			return new Promise(resolve => {
				const p = Promise.delay(2500).then(() => done = true);
				expect(done).toBe(false);
				clock.tick(1000);
				expect(done).toBe(false);
				clock.tick(1000);
				expect(done).toBe(false);
				clock.tick(1000);
				expect(done).toBe(true);

				p.then(() => resolve());
			});

		});
	});

	describe("Test Promise.timeout", () => {
		/*let clock;

		beforeAll(() => clock = lolex.install());
		afterAll(() => clock.uninstall());
		*/

		it("should be resolved", () => {
			let p = Promise.delay(200).then(() => "OK").timeout(250);

			//clock.tick(2200);
			//clock.tick(3000);

			return p.catch(protectReject).then(res => {
				expect(res).toBe("OK");
			});
		});

		it("should be resolved", () => {
			let p = Promise.resolve().delay(200).then(() => "OK").timeout(250);

			//clock.tick(2200);
			//clock.tick(3000);

			return p.catch(protectReject).then(res => {
				expect(res).toBe("OK");
			});
		});

		it("should be timed out", () => {
			let p = Promise.resolve().delay(200).then(() => "OK").timeout(150);

			//clock.tick(1700);

			return p.then(protectReject).catch(err => {
				expect(err).toBeInstanceOf(Promise.TimeoutError);
			});
		});

		it("should be timed out", () => {
			let p = Promise.resolve().delay(200).then(() => "OK").timeout(150);

			//clock.tick(2500);

			return p.then(protectReject).catch(err => {
				expect(err).toBeInstanceOf(Promise.TimeoutError);
			});
		});
	});

	describe("Test Promise.mapSeries", () => {

		it("should be resolved", () => {
			return Promise.mapSeries([
				"First",
				Promise.resolve("Second"),
				"Third",
				new Promise(resolve => resolve("Fourth"))
			], p => p).catch(protectReject).then(res => {
				expect(res).toEqual(["First", "Second", "Third", "Fourth"]);
			});
		});

		it("should be resolved the empty array", () => {
			return Promise.mapSeries([], p => p).catch(protectReject).then(res => {
				expect(res).toEqual([]);
			});
		});

		it("should be rejected", () => {
			return Promise.mapSeries([
				"First",
				Promise.resolve("Second"),
				"Third",
				new Promise((resolve, reject) => reject("Error"))
			], p => p).then(protectReject).catch(res => {
				expect(res).toEqual("Error");
			});
		});

		it("should be rejected", () => {
			const fn = jest.fn((item, i) => {
				if (i == 2)
					throw new Error("Wrong");
				return item;
			});

			return Promise.mapSeries([
				"First",
				Promise.resolve("Second"),
				"Third",
				new Promise(resolve => resolve("Fourth"))
			], fn).then(protectReject).catch(res => {
				expect(res).toBeInstanceOf(Error);
				expect(res.message).toBe("Wrong");
				expect(fn).toBeCalledTimes(3);
			});
		});
	});

});
