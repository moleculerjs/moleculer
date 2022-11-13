const ServiceBroker = require("../../src/service-broker");

describe("Test RPC", () => {
	let b1 = new ServiceBroker({
		transporter: "Fake",
		logger: false,
		nodeID: "node-1"
	});

	let eventHandler = jest.fn();

	b1.createService({
		name: "greeter",
		actions: {
			hello(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		},

		events: {
			"emitter.**": eventHandler
		}
	});

	let b2 = new ServiceBroker({
		transporter: "Fake",
		logger: false,
		nodeID: "node-2"
	});

	let b2ReplyHandler = jest.fn(ctx => ctx.params);
	b2.createService({
		name: "echo",
		actions: {
			reply: b2ReplyHandler,

			helloProxy(ctx) {
				return ctx.call("greeter.hello", ctx.params).then(res => res + " (proxied)");
			},

			emitter(ctx) {
				ctx.emit("emitter.hello.event", ctx.params);
			},

			slow() {
				return new this.Promise(resolve => {
					setTimeout(() => {
						resolve("OK");
					}, 1000);
				});
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start(), Promise.resolve().delay(2000)]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should call echo.reply on b2", () => {
		return b1.call("echo.reply", { data: 100 }).then(res => {
			expect(res).toEqual({ data: 100 });

			expect(b2ReplyHandler).toHaveBeenCalledTimes(1);
		});
	});

	it("should call double RPC (b1 -> b2 -> b1 -> b2 -> b1) & emit an event to b1", () => {
		return b1.call("echo.helloProxy", { name: "Icebob" }).then(res => {
			expect(res).toEqual("Hello Icebob (proxied)");
		});
	});

	it("should emit & receive an event via transporter", () => {
		return b1.call("echo.emitter", { a: 5 }).then(() => {
			expect(eventHandler).toHaveBeenCalledTimes(1);
			expect(eventHandler).toHaveBeenCalledWith(
				{ a: 5 },
				"node-2",
				"emitter.hello.event",
				expect.any(b1.ContextFactory)
			);
		});
	});

	it("should return with RequestTimeout", () => {
		return b1.call("echo.slow", null, { timeout: 100 }).catch(err => {
			expect(err.name).toBe("RequestTimeoutError");
			expect(["node-1", "node-2"]).toContain(err.data.nodeID);
			expect(err.data.action).toBe("echo.slow");
		});
	});

	it("should return with fallbackResponse", () => {
		let fallbackResponse = "MAYBE";
		return b1.call("echo.slow", null, { timeout: 100, fallbackResponse }).then(res => {
			expect(res).toBe("MAYBE");
		});
	});

	it("should have event listener for emitter.some.thing", () => {
		expect(b1.hasEventListener("emitter.some.thing")).toBe(true);
		expect(b2.hasEventListener("emitter.some.thing")).toBe(true);

		let res = b1.getEventListeners("emitter.some.thing");
		expect(res.length).toBe(1);
		expect(res[0].id).toBe("node-1");
		expect(res[0].event.name).toBe("emitter.**");

		res = b2.getEventListeners("emitter.some.thing");
		expect(res.length).toBe(1);
		expect(res[0].id).toBe("node-1");
		expect(res[0].event.name).toBe("emitter.**");
	});

	it("should not have event listener for other.some.thing", () => {
		expect(b1.hasEventListener("other.some.thing")).toBe(false);
		expect(b2.hasEventListener("other.some.thing")).toBe(false);

		let res = b1.getEventListeners("other.some.thing");
		expect(res.length).toBe(0);

		res = b2.getEventListeners("other.some.thing");
		expect(res.length).toBe(0);
	});
});
