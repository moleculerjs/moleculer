const ServiceBroker = require("../../src/service-broker");
const FakeTransporter = require("../../src/transporters/fake");

const { RequestTimeoutError } = require("../../src/errors");

describe("Test RPC", () => {

	let b1 = new ServiceBroker({
		transporter: new FakeTransporter(),
		nodeID: "node-1"
	});

	b1.createService({
		name: "greeter",
		actions: {
			hello(ctx) {
				return `Hello ${ctx.params.name}`;
			}
		}
	});

	let b2 = new ServiceBroker({
		transporter: new FakeTransporter(),
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

			slow() {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve("OK");
					}, 1000);
				});
			}
		}
	});

	beforeAll(() => b1.start().then(() => b2.start()));
	afterAll(() => b1.stop().then(() => b2.stop()));

	b1.nodeUnavailable = jest.fn(); // Skip

	it("should call echo.reply on b2", () => {
		return b1.call("echo.reply", { data: 100 }).then(res => {
			expect(res).toEqual({ data: 100 });

			expect(b2ReplyHandler).toHaveBeenCalledTimes(1);
		});
	});		

	it("should call double RPC (b1 -> b2 -> b1 -> b2 -> b1", () => {
		return b1.call("echo.helloProxy", { name: "Icebob" }).then(res => {
			expect(res).toEqual("Hello Icebob (proxied)");
		});
	});	

	it("should return with RequestTimeout", () => {
		return b1.call("echo.slow", null, { timeout: 100 }).catch(err => {
			expect(err).toBeInstanceOf(RequestTimeoutError);
			expect(err.nodeID).toBe("node-2");
		});
	});	

	it("should return with fallbackResponse", () => {
		let fallbackResponse = "MAYBE";
		return b1.call("echo.slow", null, { timeout: 100, fallbackResponse }).then(res => {
			expect(res).toBe("MAYBE");
		});
	});
});
