const AsyncStorage = require("../../src/async-storage");
const Promise = require("bluebird");

describe("Test Async Storage class", () => {

	it("should set broker & create store", () => {
		const broker = {};
		const storage = new AsyncStorage(broker);

		expect(storage.broker).toBe(broker);
		expect(storage.store).toBeInstanceOf(Map);
	});

	it("should store context for async thread", () => {
		const broker = {};
		const storage = new AsyncStorage(broker);

		const context = { a: 5 };

		return Promise.resolve()
			.then(() => {
				storage.setSessionData(context);
				expect(storage.getSessionData()).toBe(context);
			})
			.then(() => {
				expect(storage.getSessionData()).toBe(context);
			});
		/*.then(() => new Promise(resolve => setTimeout(resolve, 50)));
			.then(() => {
				// TODO: need fix
				expect(storage.getSessionData()).toBe(context);
			});
			*/
	});

});

