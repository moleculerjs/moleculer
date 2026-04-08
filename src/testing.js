"use strict";

const EventEmitter = require("events");
const ServiceBroker = require("./service-broker");

const EventCatcher = {
	name: "EventCatcher",

	created(broker) {
		const events = [];
		const emitter = new EventEmitter();

		broker.test = broker.test || {};

		Object.assign(broker.test, {
			getEvents() {
				return [...events];
			},

			eventEmitted(name) {
				return events.some(e => e.name === name);
			},

			eventEmittedTimes(name) {
				return events.filter(e => e.name === name).length;
			},

			// subset match — only checks keys present in params
			eventEmittedWithParams(name, params) {
				return events.some(e => {
					if (e.name !== name) return false;
					if (!params || typeof params !== "object") return true;
					for (const [key, value] of Object.entries(params)) {
						if (e.payload === null || typeof e.payload !== "object") return false;
						if (e.payload[key] !== value) return false;
					}
					return true;
				});
			},

			waitForEvent(name, timeout = 5000) {
				// already fired
				if (events.some(e => e.name === name)) return Promise.resolve();

				return new Promise((resolve, reject) => {
					const timer = setTimeout(() => {
						emitter.off(name, onEvent);
						reject(new Error(`[EventCatcher] timed out waiting for '${name}' (${timeout}ms)`));
					}, timeout);

					const onEvent = () => {
						clearTimeout(timer);
						resolve();
					};

					emitter.once(name, onEvent);
				});
			},

			clearEvents() {
				events.length = 0;
			},
		});

		const record = (name, payload, type) => {
			events.push({ name, payload, type });
			emitter.emit(name, payload);
		};

		return {
			emit(next) {
				return (name, payload, opts) => {
					record(name, payload, "emit");
					return next(name, payload, opts);
				};
			},
			broadcast(next) {
				return (name, payload, opts) => {
					record(name, payload, "broadcast");
					return next(name, payload, opts);
				};
			},
			broadcastLocal(next) {
				return (name, payload, opts) => {
					record(name, payload, "broadcastLocal");
					return next(name, payload, opts);
				};
			},
		};
	},
};

const MockingCalls = {
	name: "MockingCalls",

	created(broker) {
		const mocks = new Map();
		const calls = [];

		broker.test = broker.test || {};

		class MockBuilder {
			constructor(actionName) {
				this._action = actionName;
				this._params = undefined;
				this._meta = undefined;
				this._returnVal = undefined;
				this._rejectErr = undefined;
			}

			withParams(params) { this._params = params; return this; }
			withMeta(meta) { this._meta = meta; return this; }

			returnValue(value) {
				this._returnVal = value;
				this._commit();
				return this;
			}

			rejectWith(error) {
				this._rejectErr = error;
				this._commit();
				return this;
			}

			_commit() {
				if (!mocks.has(this._action)) mocks.set(this._action, []);
				mocks.get(this._action).push({
					params: this._params,
					meta: this._meta,
					response: this._returnVal,
					error: this._rejectErr,
				});
			}
		}

		Object.assign(broker.test, {
			mockAction(actionName) {
				return new MockBuilder(actionName);
			},

			getCalls() {
				return [...calls];
			},

			actionCalled(actionName) {
				return calls.some(c => c.action === actionName);
			},

			actionCalledTimes(actionName) {
				return calls.filter(c => c.action === actionName).length;
			},

			actionCalledWithParams(actionName, params) {
				return calls.some(c => {
					if (c.action !== actionName) return false;
					if (!params || typeof params !== "object") return true;
					for (const [key, value] of Object.entries(params)) {
						if (!c.params || c.params[key] !== value) return false;
					}
					return true;
				});
			},

			clearMocks() { mocks.clear(); },
			clearActions() { calls.length = 0; },

			clearAll() {
				mocks.clear();
				calls.length = 0;
				broker.test.clearEvents?.();
			},
		});

		return {
			call(next) {
				return (actionName, params, opts) => {
					calls.push({ action: actionName, params, meta: opts?.meta ?? {} });

					const mockList = mocks.get(actionName);
					if (mockList?.length) {
						const match = mockList.find(mock => {
							if (mock.params) {
								if (!params) return false;
								for (const [k, v] of Object.entries(mock.params)) {
									if (params[k] !== v) return false;
								}
							}
							if (mock.meta) {
								const callMeta = opts?.meta ?? {};
								for (const [k, v] of Object.entries(mock.meta)) {
									if (callMeta[k] !== v) return false;
								}
							}
							return true;
						});

						if (match) {
							if (match.error) return Promise.reject(match.error);
							return Promise.resolve(match.response);
						}
					}

					return next(actionName, params, opts);
				};
			},
		};
	},
};

function createBroker(options, mockServices) {
	const broker = new ServiceBroker({
		logger: false,
		test: true,
		...options,
		middlewares: [
			EventCatcher,
			MockingCalls,
			...((options && options.middlewares) || []),
		],
	});

	if (Array.isArray(mockServices)) {
		for (const schema of mockServices) {
			broker.createService(schema);
		}
	}

	return broker;
}

module.exports = {
	createBroker,
	EventCatcher,
	MockingCalls,
};
