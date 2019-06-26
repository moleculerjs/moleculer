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

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
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
			expect(eventHandler).toHaveBeenCalledWith({ a: 5 }, "node-2", "emitter.hello.event", expect.any(b1.ContextFactory));
		});
	});

	it("should return with RequestTimeout", () => {
		return b1.call("echo.slow", null, { timeout: 100 }).catch(err => {
			expect(err.name).toBe("RequestTimeoutError");
			expect(err.data.nodeID).toBe("node-2");
			expect(err.data.action).toBe("echo.slow");
		});
	});

	it("should return with fallbackResponse", () => {
		let fallbackResponse = "MAYBE";
		return b1.call("echo.slow", null, { timeout: 100, fallbackResponse }).then(res => {
			expect(res).toBe("MAYBE");
		});
	});
});
