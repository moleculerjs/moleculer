"use strict";

const memwatch = require("@icebob/node-memwatch");
const { ServiceBroker } = require("../..");

const COUNTER = 10 * 1000;
const ACCEPTABLE_LIMIT = 1 * 1024 * 1024; // 1MB

jest.setTimeout(60000);

describe("Moleculer memory leak test", () => {
	describe("Test normal action calls", () => {
		const broker = new ServiceBroker({ logger: false });
		const svc = broker.createService({
			name: "greeter",

			actions: {
				welcome: {
					params: {
						name: "string"
					},
					handler(ctx) {
						return `Hello ${ctx.params.name}`;
					}
				}
			},
			events: {
				"user.created"(ctx) {
					// User created
				}
			}
		});

		beforeAll(async () => {
			await broker.start();

			// Warm up
			for (let i = 0; i < 20; i++) {
				await broker.call("greeter.welcome", {
					name: "Warm up"
				});
				await broker.emit("user.created", {
					name: "Warm up"
				});
			}
			memwatch.gc();
		});

		afterAll(() => broker.stop());

		async function execute(type, actionName, params) {
			const hd = new memwatch.HeapDiff();

			const paramsIsFunc = typeof params == "function";

			for (let i = 0; i < COUNTER; i++) {
				const p = paramsIsFunc ? params() : params;
				if (type == "call") await broker.call(actionName, p);
				else if (type == "emit") await broker.emit(actionName, p);
				else throw new Error("Unknow type: " + type);
			}

			memwatch.gc();
			const diff = hd.end();
			if (diff.change.size_bytes >= ACCEPTABLE_LIMIT) console.log("Diff:", diff); // eslint-disable-line no-console

			expect(diff.change.size_bytes).toBeLessThan(ACCEPTABLE_LIMIT);
		}

		it("should not leak when call an action", async () => {
			await execute("call", "greeter.welcome", { name: "Moleculer" });
		});

		it("should not leak when sending & receiving event", async () => {
			await execute("emit", "user.created", { name: "John Doe" });
		});
	});
});
