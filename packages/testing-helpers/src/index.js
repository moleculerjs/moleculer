// Minimal testing helpers for Moleculer (intentionally small & synchronous/async-friendly)
//
// Exports:
//  - createBrokerHelper(opts?) => { broker, mockAction, mockEvent, restore }
//  - mockAction(name, fn?) and mockEvent(name)
//

function createBrokerHelper(opts = {}) {
  const actions = new Map();
  const events = new Map();
  const calls = [];

  const broker = {
    // simulate broker.call(actionName, params)
    async call(actionName, params) {
      calls.push({ type: 'call', actionName, params });
      const fn = actions.get(actionName);
      if (!fn) {
        throw new Error(`Action "${actionName}" not mocked`);
      }
      // support fn returning promise or value
      return Promise.resolve(fn(params));
    },

    // simulate broker.emit(eventName, payload)
    emit(eventName, payload) {
      calls.push({ type: 'emit', eventName, payload });
      const fn = events.get(eventName);
      if (fn) {
        try {
          fn(payload);
        } catch (e) {
          // swallow to mimic emitter behaviour
        }
      }
    },

    // expose internals for assertions
    __testing__: {
      actions,
      events,
      calls,
    },

    // convenience stop
    async stop() {
      return Promise.resolve();
    },
  };

  function mockAction(name, impl) {
    // simple jest-like mock: if jest available, use jest.fn
    const mockFn = (typeof global?.jest === 'function' && global.jest && global.jest.fn)
      ? global.jest.fn(impl)
      : function(...args) { return impl ? impl(...args) : undefined; };

    actions.set(name, mockFn);
    return mockFn;
  }

  function mockEvent(name, impl) {
    const mockFn = (typeof global?.jest === 'function' && global.jest && global.jest.fn)
      ? global.jest.fn(impl)
      : function(...args) { return impl ? impl(...args) : undefined; };

    events.set(name, mockFn);
    return mockFn;
  }

  function restore() {
    actions.clear();
    events.clear();
    calls.length = 0;
  }

  return { broker, mockAction, mockEvent, restore };
}

module.exports = { createBrokerHelper };
