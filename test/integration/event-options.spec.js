"use strict";

const ServiceBroker = require("../../src/service-broker");
const { MoleculerError } = require("../../src/errors");

/**
 * In 0.15 the third parameter of `emit`, `broadcast` and `broadcastLocal`
 * (on the broker and on the Context) can only be an options object.
 * The old group shorthand (`"mailer"` or `["mailer"]`) must be rejected with a
 * descriptive error instead of being silently converted (broker) or crashing
 * with a cryptic TypeError / dropping the parent context (Context).
 */
describe("Test the third (options) parameter of emit/broadcast/broadcastLocal", () => {
	let received = [];

	// An options object reused by many calls (e.g. a module-level constant)
	const SHARED_OPTS = { groups: "mailer" };

	const recorder = name => ({
		name,
		events: {
			"user.created"(ctx) {
				received.push({
					node: this.broker.nodeID,
					service: this.name,
					eventType: ctx.eventType,
					requestID: ctx.requestID,
					level: ctx.level,
					meta: ctx.meta
				});
			}
		}
	});

	const createNode = nodeID =>
		new ServiceBroker({
			namespace: "event-options",
			nodeID,
			transporter: "Fake",
			logger: false
		});

	const apiNode = createNode("api");
	apiNode.createService({
		name: "api",
		actions: {
			// Calls ctx.emit/ctx.broadcast with the given third parameter
			notify(ctx) {
				return ctx[ctx.params.method]("user.created", { id: 1 }, ctx.params.opts);
			},
			// Calls ctx.emit/ctx.broadcast with the shared options object
			notifyShared(ctx) {
				return ctx[ctx.params.method]("user.created", { id: 1 }, SHARED_OPTS);
			}
		}
	});
	// A local listener on the emitter node (for broadcastLocal)
	apiNode.createService(recorder("audit"));

	const mailNode = createNode("mail");
	mailNode.createService(recorder("mailer"));

	const payNode = createNode("pay");
	payNode.createService(recorder("payment"));

	const nodes = [apiNode, mailNode, payNode];

	const callNotify = (method, opts) =>
		apiNode.call(
			"api.notify",
			{ method, opts },
			{ meta: { user: "john" }, requestID: "req-1" }
		);

	const flush = () => new Promise(resolve => setTimeout(resolve, 50));

	beforeAll(async () => {
		await Promise.all(nodes.map(node => node.start()));
		await apiNode.waitForServices(["mailer", "payment"]);
	});
	afterAll(() => Promise.all(nodes.map(node => node.stop())));
	beforeEach(() => (received = []));

	describe("valid options", () => {
		it("ctx.emit with { groups } should route to the group and keep the parent context", async () => {
			await callNotify("emit", { groups: ["mailer"] });
			await flush();

			expect(received).toEqual([
				{
					node: "mail",
					service: "mailer",
					eventType: "emit",
					requestID: "req-1",
					level: 2,
					meta: { user: "john" }
				}
			]);
		});

		it("ctx.broadcast with { groups } should route to the group and keep the parent context", async () => {
			await callNotify("broadcast", { groups: ["payment"] });
			await flush();

			expect(received).toEqual([
				{
					node: "pay",
					service: "payment",
					eventType: "broadcast",
					requestID: "req-1",
					level: 2,
					meta: { user: "john" }
				}
			]);
		});

		it.each([undefined, null])(
			"ctx.emit with %p options should reach every group",
			async opts => {
				await callNotify("emit", opts);
				await flush();

				expect(received.map(r => r.service).sort()).toEqual(["audit", "mailer", "payment"]);
				received.forEach(r => {
					expect(r.requestID).toBe("req-1");
					expect(r.level).toBe(2);
					expect(r.meta).toEqual({ user: "john" });
				});
			}
		);

		it.each([
			["emit", { groups: ["payment"] }, ["payment"]],
			["emit", { groups: "payment" }, ["payment"]],
			["broadcast", { groups: ["mailer", "payment"] }, ["mailer", "payment"]],
			["broadcastLocal", { groups: ["audit"] }, ["audit"]],
			["emit", null, ["audit", "mailer", "payment"]],
			["broadcast", undefined, ["audit", "mailer", "payment"]],
			["broadcastLocal", undefined, ["audit"]]
		])("broker.%s with %p should reach %p", async (method, opts, expected) => {
			await apiNode[method]("user.created", { id: 1 }, opts);
			await flush();

			expect(received.map(r => r.service).sort()).toEqual(expected);
		});
	});

	describe("the removed group shorthand is rejected", () => {
		const errorMessage = (method, received) =>
			`The third parameter of '${method}' must be an options object, e.g. { groups: ["mailer"] }, but received ${received}.`;

		it("ctx.emit with a string should fail with a descriptive error", async () => {
			const err = await callNotify("emit", "mailer").catch(err => err);
			await flush();

			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.message).toBe(errorMessage("ctx.emit", "a string"));
			expect(err.type).toBe("INVALID_PARAMETERS");
			expect(received).toEqual([]);
		});

		it("ctx.emit with an array must not silently drop the parent context", async () => {
			const err = await callNotify("emit", ["mailer"]).catch(err => err);
			await flush();

			// No handler may run with a detached context (new requestID, level 1, no meta)
			expect(received).toEqual([]);
			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.message).toBe(errorMessage("ctx.emit", "an array"));
		});

		it("ctx.broadcast with a string should fail with a descriptive error", async () => {
			const err = await callNotify("broadcast", "payment").catch(err => err);
			await flush();

			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.message).toBe(errorMessage("ctx.broadcast", "a string"));
			expect(received).toEqual([]);
		});

		it("ctx.broadcast with an array must not silently drop the parent context", async () => {
			const err = await callNotify("broadcast", ["payment"]).catch(err => err);
			await flush();

			expect(received).toEqual([]);
			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.message).toBe(errorMessage("ctx.broadcast", "an array"));
		});

		it.each([
			["emit", "mailer", "a string"],
			["emit", ["mailer"], "an array"],
			["broadcast", "payment", "a string"],
			["broadcast", ["mailer", "payment"], "an array"],
			["broadcastLocal", "audit", "a string"],
			["broadcastLocal", ["audit"], "an array"],
			["emit", 5, "a number"],
			["broadcast", true, "a boolean"]
		])("broker.%s with %p should not route to groups but throw", async (method, opts, desc) => {
			let err;
			try {
				await apiNode[method]("user.created", { id: 1 }, opts);
			} catch (e) {
				err = e;
			}
			await flush();

			expect(received).toEqual([]);
			expect(err).toBeInstanceOf(MoleculerError);
			expect(err.message).toBe(errorMessage(`broker.${method}`, desc));
			expect(err.type).toBe("INVALID_PARAMETERS");
		});
	});
	describe("shared options object", () => {
		it.each(["emit", "broadcast"])(
			"ctx.%s should not write the context into the caller's options object",
			async method => {
				await apiNode.call(
					"api.notifyShared",
					{ method },
					{ meta: { user: "john" }, requestID: "req-shared" }
				);
				await flush();

				expect(SHARED_OPTS).toEqual({ groups: "mailer" });
				expect(SHARED_OPTS.parentCtx).toBeUndefined();

				// A later emit outside of any context must not inherit the old request
				received = [];
				await apiNode.emit("user.created", { id: 2 }, SHARED_OPTS);
				await flush();

				const mailer = received.filter(r => r.service === "mailer");
				expect(mailer).toHaveLength(1);
				expect(mailer[0].requestID).not.toBe("req-shared");
				expect(mailer[0].meta).toEqual({});
				expect(mailer[0].level).toBe(1);
			}
		);
	});
});
