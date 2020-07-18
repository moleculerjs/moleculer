const { BrokerOptionsError } = require("../../../../src/errors");
const Discoverers = require("../../../../src/registry/discoverers");

describe("Test Discoverers resolver", () => {

	it("should resolve default Local discoverer", () => {
		const discoverer = Discoverers.resolve();
		expect(discoverer).toBeInstanceOf(Discoverers.Local);
	});

	it("should resolve Local reporter from string", () => {
		const discoverer = Discoverers.resolve("Local");
		expect(discoverer).toBeInstanceOf(Discoverers.Local);
	});

	it("should resolve Local discoverer from obj", () => {
		const options = { heartbeatInterval: 8 };
		const discoverer = Discoverers.resolve({ type: "Local", options });
		expect(discoverer).toBeInstanceOf(Discoverers.Local);
		expect(discoverer.opts).toEqual(expect.objectContaining({ heartbeatInterval: 8 }));
	});

	it("should resolve Local discoverer from instance", () => {
		const instance = new Discoverers.Local();
		const discoverer = Discoverers.resolve(instance);
		expect(discoverer).toBe(instance);
	});

	it("should resolve Etcd3 reporter from string", () => {
		const discoverer = Discoverers.resolve("Etcd3");
		expect(discoverer).toBeInstanceOf(Discoverers.Etcd3);
	});

	it("should resolve Etcd3 reporter from connection string", () => {
		const discoverer = Discoverers.resolve("etcd3://server:2345");
		expect(discoverer).toBeInstanceOf(Discoverers.Etcd3);
		expect(discoverer.opts.etcd).toEqual({ hosts: "server:2345" });
	});

	it("should resolve Etcd3 discoverer from obj", () => {
		const options = { heartbeatInterval: 8 };
		const discoverer = Discoverers.resolve({ type: "Etcd3", options });
		expect(discoverer).toBeInstanceOf(Discoverers.Etcd3);
		expect(discoverer.opts).toEqual(expect.objectContaining({ heartbeatInterval: 8 }));
	});

	it("should resolve Etcd3 discoverer from instance", () => {
		const instance = new Discoverers.Etcd3();
		const discoverer = Discoverers.resolve(instance);
		expect(discoverer).toBe(instance);
	});

	it("should resolve Redis reporter from string", () => {
		const discoverer = Discoverers.resolve("Redis");
		expect(discoverer).toBeInstanceOf(Discoverers.Redis);
	});

	it("should resolve Redis reporter from connection string", () => {
		const discoverer = Discoverers.resolve("redis://redis-server:6379");
		expect(discoverer).toBeInstanceOf(Discoverers.Redis);
		expect(discoverer.opts.redis).toEqual("redis://redis-server:6379");
	});

	it("should resolve Redis discoverer from obj", () => {
		const options = { heartbeatInterval: 8 };
		const discoverer = Discoverers.resolve({ type: "Redis", options });
		expect(discoverer).toBeInstanceOf(Discoverers.Redis);
		expect(discoverer.opts).toEqual(expect.objectContaining({ heartbeatInterval: 8 }));
	});

	it("should resolve Redis discoverer from instance", () => {
		const instance = new Discoverers.Redis();
		const discoverer = Discoverers.resolve(instance);
		expect(discoverer).toBe(instance);
	});

	it("should throw error if not found by name", () => {
		expect(() => Discoverers.resolve("xyz")).toThrowError(BrokerOptionsError);
		expect(() => Discoverers.resolve({ type: "xyz" })).toThrowError(BrokerOptionsError);
	});
});


describe("Test Discoverer register", () => {
	class MyCustom {}

	it("should throw error if type if not correct", () => {
		expect(() => {
			Discoverers.resolve("MyCustom");
		}).toThrowError(BrokerOptionsError);
	});

	it("should register new type", () => {
		Discoverers.register("MyCustom", MyCustom);
		expect(Discoverers.MyCustom).toBe(MyCustom);
	});

	it("should find the new type", () => {
		const discoverer = Discoverers.resolve("MyCustom");
		expect(discoverer).toBeInstanceOf(MyCustom);
	});
});
