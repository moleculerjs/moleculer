"use strict";

jest.mock("async_hooks");
const asyncHooks = require("async_hooks");

const executionAsyncIdMock = jest.fn(() => "currentUidMock");
asyncHooks.executionAsyncId = executionAsyncIdMock;

const enableHookMock = jest.fn();
const disableHookMock = jest.fn();
const createHookMock = jest
	.fn()
	.mockReturnValueOnce("createHookMock") // constructor test
	.mockReturnValue({ enable: enableHookMock, disable: disableHookMock });
asyncHooks.createHook = createHookMock;

const AsyncStorage = require("../../src/async-storage");

beforeAll(() => {
	jest.clearAllMocks();
});

describe("Test 'AsyncStorage' class", () => {
	const broker = {};

	describe("Test constructor", () => {
		it("should set broker & hook & executionAsyncId & store, ", () => {
			const _initBindMock = jest.fn(() => "_initBindMock");
			//const _beforeBindMock = jest.fn(() => "_beforeBindMock");
			//const _afterBindMock = jest.fn(() => "_afterBindMock");
			const _destroyBindMock = jest.fn(() => "_destroyBindMock");

			AsyncStorage.prototype._init.bind = _initBindMock;
			//AsyncStorage.prototype._before.bind = _becoreBindMock;
			//AsyncStorage.prototype._after.bind = _afterBindMock;
			AsyncStorage.prototype._destroy.bind = _destroyBindMock;

			// ---- ^ SETUP ^ ---
			const storage = new AsyncStorage(broker);
			// ---- ˇ ASSERTS ˇ ---

			expect(storage.broker).toBe(broker);
			expect(asyncHooks.createHook).toBeCalledTimes(1);
			expect(asyncHooks.createHook).toBeCalledWith({
				init: "_initBindMock",
				//before: "_beforeBindMock",
				//after: "_afterBindMock",
				destroy: "_destroyBindMock",
				promiseResolve: "_destroyBindMock",
			});
			expect(storage.hook).toEqual("createHookMock");

			const thisOnMock = {
				broker: {},
				executionAsyncId: executionAsyncIdMock,
				hook: "createHookMock",
				store: new Map(),
			};
			expect(_initBindMock).toBeCalledTimes(1);
			expect(_initBindMock).toBeCalledWith(thisOnMock);
			//expect(_beforeBindMock).toBeCalledTimes(1);
			//expect(_beforeBindMock).toBeCalledWith(thisOnMock);
			//expect(_afterBindMock).toBeCalledTimes(1);
			//expect(_afterBindMock).toBeCalledWith(thisOnMock);
			expect(_destroyBindMock).toBeCalledTimes(2);
			expect(_destroyBindMock).toHaveBeenNthCalledWith(1, thisOnMock);
			expect(_destroyBindMock).toHaveBeenNthCalledWith(2, thisOnMock);
			expect(storage.executionAsyncId).toBe(executionAsyncIdMock);
			expect(storage.store).toBeInstanceOf(Map);
			expect(storage.store.size).toEqual(0);

			_initBindMock.mockClear();
			//_beforeBindMock.mockClear();
			//_afterBindMock.mockClear();
			_destroyBindMock.mockClear();
		});
	});

	describe("Test 'enable' function", () => {
		it("should call hook enable function", () => {
			const storage = new AsyncStorage(broker);
			// ---- ^ SETUP ^ ---
			storage.enable();
			// ---- ˇ ASSERTS ˇ ---
			expect(enableHookMock).toBeCalledTimes(1);
			expect(enableHookMock).toBeCalledWith();

			enableHookMock.mockClear();
		});
	});

	describe("Test 'disable' function", () => {
		it("should call hook disable function", () => {
			const storage = new AsyncStorage(broker);
			// ---- ^ SETUP ^ ---
			storage.disable();
			// ---- ˇ ASSERTS ˇ ---
			expect(disableHookMock).toBeCalledTimes(1);
			expect(disableHookMock).toBeCalledWith();

			disableHookMock.mockClear();
		});
	});

	describe("Test 'stop' function", () => {
		it("should call hook disable and store clear function", () => {
			const storage = new AsyncStorage(broker);
			jest.spyOn(Map.prototype, "clear");
			// ---- ^ SETUP ^ ---
			storage.stop();
			// ---- ˇ ASSERTS ˇ ---
			expect(disableHookMock).toBeCalledTimes(1);
			expect(disableHookMock).toBeCalledWith();
			expect(storage.store.clear).toBeCalledTimes(1);
			expect(storage.store.clear).toBeCalledWith();

			disableHookMock.mockClear();
		});
	});

	describe("Test 'getAsyncId' method", () => {
		it("should call and return executionAsyncId function", () => {
			const storage = new AsyncStorage(broker);
			// ---- ^ SETUP ^ ---
			const res = storage.getAsyncId();
			// ---- ˇ ASSERTS ˇ ---
			expect(executionAsyncIdMock).toBeCalledTimes(1);
			expect(executionAsyncIdMock).toBeCalledWith();
			expect(res).toEqual("currentUidMock");

			executionAsyncIdMock.mockClear();
		});
	});

	describe("Test 'setSessionData' method", () => {
		it("should get executionAsyncId and set store", () => {
			const storage = new AsyncStorage(broker);
			storage.store = { set: jest.fn() };
			// ---- ^ SETUP ^ ---
			storage.setSessionData("dataMock");
			// ---- ˇ ASSERTS ˇ ---
			expect(executionAsyncIdMock).toBeCalledTimes(1);
			expect(executionAsyncIdMock).toBeCalledWith();
			expect(storage.store.set).toBeCalledTimes(1);
			expect(storage.store.set).toBeCalledWith("currentUidMock", {
				data: "dataMock",
				owner: "currentUidMock",
			});

			executionAsyncIdMock.mockClear();
		});
	});

	describe("Test 'getSessionData' method", () => {
		it("should get executionAsyncId and get item from store (item has data)", () => {
			const storage = new AsyncStorage(broker);
			storage.store = {
				get: jest.fn(() => {
					return {
						data: "itemDataMock",
					};
				}),
			};
			// ---- ^ SETUP ^ ---
			const res = storage.getSessionData();
			// ---- ˇ ASSERTS ˇ ---
			expect(executionAsyncIdMock).toBeCalledTimes(1);
			expect(executionAsyncIdMock).toBeCalledWith();
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("currentUidMock");
			expect(res).toEqual("itemDataMock");

			executionAsyncIdMock.mockClear();
		});

		it("should get executionAsyncId and get item from store (item has no data)", () => {
			const storage = new AsyncStorage(broker);
			storage.store = {
				get: jest.fn(),
			};
			// ---- ^ SETUP ^ ---
			const res = storage.getSessionData();
			// ---- ˇ ASSERTS ˇ ---
			expect(executionAsyncIdMock).toBeCalledTimes(1);
			expect(executionAsyncIdMock).toBeCalledWith();
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("currentUidMock");
			expect(res).toBeNull();

			executionAsyncIdMock.mockClear();
		});

		it("should getSessionData return what setSessionData set before", () => {
			const storage = new AsyncStorage(broker);
			const context = { a: 5 };
			storage.setSessionData(context);
			// ---- ^ SETUP ^ ---
			let storagedContext = storage.getSessionData();
			// ---- ˇ ASSERTS ˇ ---
			expect(storagedContext).toBe(context);
		});
	});

	describe("Test '_init' function", () => {
		it("should return if type is 'TIMERWRAP'", () => {
			const storage = new AsyncStorage(broker);
			storage.store = { get: jest.fn(), set: jest.fn() };
			// ---- ^ SETUP ^ ---
			const res = storage._init(null, "TIMERWRAP", null);
			// ---- ˇ ASSERTS ˇ ---
			expect(storage.store.get).toBeCalledTimes(0);
			expect(storage.store.set).toBeCalledTimes(0);
			expect(res).toBeUndefined();
		});

		it("should does nothing if store does not contain item by trigerAsyncId", () => {
			const storage = new AsyncStorage(broker);
			storage.store = { get: jest.fn(), set: jest.fn() };
			// ---- ^ SETUP ^ ---
			storage._init("asyncId", "NOT_TIMERWRAP", "triggerAsyncId");
			// ---- ˇ ASSERTS ˇ ---
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("triggerAsyncId");
			expect(storage.store.set).toBeCalledTimes(0);
		});

		it("should set item in store (triggerAsyncId -> asyncId)", () => {
			const storage = new AsyncStorage(broker);
			storage.store = { get: jest.fn(() => "itemMock"), set: jest.fn() };
			// ---- ^ SETUP ^ ---
			storage._init("asyncId", "NOT_TIMERWRAP", "triggerAsyncId");
			// ---- ˇ ASSERTS ˇ ---
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("triggerAsyncId");
			expect(storage.store.set).toBeCalledTimes(1);
			expect(storage.store.set).toBeCalledWith("asyncId", "itemMock");
		});
	});

	describe("Test '_destroy' function", () => {
		it("should does nothing if store does not contain item by trigerAsyncId", () => {
			const storage = new AsyncStorage(broker);
			storage.store = { get: jest.fn(), delete: jest.fn() };
			// ---- ^ SETUP ^ ---
			storage._destroy("asyncId");
			// ---- ˇ ASSERTS ˇ ---
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("asyncId");
			expect(storage.store.delete).toBeCalledTimes(0);
		});

		it("should delete item from store by asyncId", () => {
			const storage = new AsyncStorage(broker);
			storage.store = {
				get: jest.fn(() => "itemMock"),
				delete: jest.fn(),
			};
			// ---- ^ SETUP ^ ---
			storage._destroy("asyncId");
			// ---- ˇ ASSERTS ˇ ---
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("asyncId");
			expect(storage.store.delete).toBeCalledTimes(1);
			expect(storage.store.delete).toBeCalledWith("asyncId");
		});

		// Commented case
		/*it("should delete item from store by asyncId and delete owner if equal asyncId", () => {
			const storage = new AsyncStorage(broker);
			let data = { owner: "asyncId", data: "dataMock" };
			storage.store = {
				get: jest.fn(() => {
					return data;
				}),
				delete: jest.fn(),
			};
			// ---- ^ SETUP ^ ---
			storage._destroy("asyncId");
			// ---- ˇ ASSERTS ˇ ---
			expect(storage.store.get).toBeCalledTimes(1);
			expect(storage.store.get).toBeCalledWith("asyncId");
			expect(storage.store.delete).toBeCalledTimes(1);
			expect(storage.store.delete).toBeCalledWith("asyncId");
			expect(data.data).tobeNull();
		});*/
	});
});
