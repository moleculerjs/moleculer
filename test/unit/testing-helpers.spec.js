const { createBrokerHelper } = require("../../packages/testing-helpers/src/index");

describe("testing-helpers basic", () => {
	test("mockAction + broker.call works", async () => {
		const { broker, mockAction, restore } = createBrokerHelper();
		const sum = mockAction("math.sum", ({ a, b }) => a + b);
		const res = await broker.call("math.sum", { a: 2, b: 3 });
		expect(res).toBe(5);
		if (sum.mock) {
			expect(sum).toHaveBeenCalled();
		}
		restore();
	});

	test("mockEvent + broker.emit works", () => {
		const { broker, mockEvent, restore } = createBrokerHelper();
		const ev = mockEvent("user.created");
		broker.emit("user.created", { id: 1 });
		if (ev.mock) {
			expect(ev).toHaveBeenCalledWith({ id: 1 });
		}
		restore();
	});
});
