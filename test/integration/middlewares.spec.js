const ServiceBroker = require("../../src/service-broker");
const Promise = require("bluebird");
const utils = require("../../src/utils");

describe("Test middleware system", () => {

	describe("Test with sync & async middlewares", () => {
		let flow = [];
		let mw1Sync = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2Async = handler => {
			return ctx => {
				flow.push("B2");
				return new Promise(resolve => {
					setTimeout(() => {
						flow.push("B2P");
						resolve();
					}, 10);
				}).then(() => {
					return handler(ctx);
				}).then(res => {
					flow.push("A2");
					return res;
				});
			};
		};

		let broker = new ServiceBroker({ logger: false, validation: false });
		broker.use(mw2Async);
		broker.use(mw1Sync);

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should register plugins", () => {
			expect(broker.middlewares.length).toBe(2);
		});

		it("should call all middlewares functions & master", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "icebob" });
				expect(master).toHaveBeenCalledTimes(1);

				expect(flow.join("-")).toBe("B1-B2-B2P-MASTER-A2-A1");
			});
		});
	});

	describe("Test with SYNC break", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2 = () => {
			return () => {
				flow.push("B2");
				// Don't call handler, break the chain
				return Promise.resolve({ user: "bobcsi" });
			};
		};

		let mw3 = handler => {
			return ctx => {
				flow.push("B3");
				return handler(ctx).then(res => {
					flow.push("A3");
					return res;
				});
			};
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };
		});

		let broker = new ServiceBroker({ logger: false, validation: false });
		broker.use(mw3, mw2, mw1);

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should register plugins", () => {
			expect(broker.middlewares.length).toBe(3);
		});

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "bobcsi" });
				expect(master).toHaveBeenCalledTimes(0);
				expect(flow.join("-")).toBe("B1-B2-A1");
			});
		});
	});

	describe("Test middleware system with ASYNC break", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2 = () => {
			return () => {
				flow.push("B2");
				return new Promise(resolve => {
					setTimeout(() => {
						flow.push("B2P");
						resolve({ user: "bobcsi" });
					}, 10);
				});
			};
		};

		let mw3 = handler => {
			return ctx => {
				flow.push("B3");
				return handler(ctx).then(res => {
					flow.push("A3");
					return res;
				});
			};
		};

		let master = jest.fn(() => {
			flow.push("MASTER");
			return { user: "icebob" };

		});

		let broker = new ServiceBroker({ logger: false, validation: false });
		broker.use(mw3, mw2, mw1);

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should register plugins", () => {
			expect(broker.middlewares.length).toBe(3);
		});

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.then(res => {
				expect(res).toEqual({ user: "bobcsi" });
				expect(master).toHaveBeenCalledTimes(0);
				expect(flow.join("-")).toBe("B1-B2-B2P-A1");
			});
		});
	});

	describe("Test with Error", () => {
		let flow = [];
		let mw1 = handler => {
			return ctx => {
				flow.push("B1");
				return handler(ctx).then(res => {
					flow.push("A1");
					return res;
				});
			};
		};

		let mw2 = () => {
			return () => {
				flow.push("B2");
				return Promise.reject(new Error("Something happened in mw2"));
			};
		};

		let master = jest.fn(() => {
			return new Promise(resolve => {
				flow.push("MASTER");
				resolve({ user: "icebob" });
			});
		});

		let broker = new ServiceBroker({ logger: false, validation: false });
		broker.use(mw2, mw1);

		broker.createService({
			name: "test",
			actions: {
				foo: master
			}
		});

		beforeAll(() => broker.start());
		afterAll(() => broker.stop());

		it("should call only mw1 & mw2 middlewares functions", () => {
			let p = broker.call("test.foo");
			expect(utils.isPromise(p)).toBe(true);
			return p.catch(err => {
				expect(err.message).toEqual("Something happened in mw2");
				expect(flow.join("-")).toBe("B1-B2");
			});
		});
	});

});
