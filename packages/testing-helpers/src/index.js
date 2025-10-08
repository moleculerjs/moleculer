// packages/testing-helpers/src/index.js
// Minimal testing helpers for Moleculer tests.
// - createBrokerHelper(): crea un broker ligero y retorna helpers enlazados.
// - mockAction(name, fn): registra un servicio/acción para tests.
// - mockEvent(name, fn): registra un listener de evento para tests.

const { ServiceBroker } = require("moleculer");

function parseActionName(fullName = "") {
  // "math.sum" -> { service: "math", action: "sum" }
  const idx = fullName.indexOf(".");
  if (idx === -1) return { service: fullName || "__mock__", action: "default" };
  return { service: fullName.slice(0, idx), action: fullName.slice(idx + 1) };
}

function createBrokerHelper(opts = {}) {
  // Broker with minimal config for tests
  const broker = new ServiceBroker({
    logger: false,
    transporter: null,
    ...opts,
  });

  // Start/stop helpers (async)
  async function start() {
    await broker.start();
    return broker;
  }
  async function stop() {
    try {
      await broker.stop();
    } catch (err) {
      // ignore
    }
  }

  // Register an action for tests.
  // name e.g. "math.sum"
  // handler(ctx) or handler(params) allowed
  function mockAction(name, handler) {
    const { service, action } = parseActionName(name);
    const actions = {
      [action]: function (ctx) {
        // Accept handler as (ctx) or (params)
        if (!handler) return null;
        try {
          // If handler expects ctx, call with ctx; if expects plain params call with ctx.params
          return handler.length === 1 ? handler(ctx) : handler(ctx.params);
        } catch (err) {
          throw err;
        }
      },
    };

    // If service exists already, extend it; otherwise create new
    // createService merges when same name appears in tests (moleculer allows multiple createService; it's ok)
    broker.createService({
      name: service || "__mock__",
      actions,
    });

    return () => broker.call(name);
  }

  // Register an event listener for tests.
  // name e.g. "user.created"
  function mockEvent(name, handler) {
    broker.createService({
      name: "__event_mock__" + Math.random().toString(36).slice(2, 8),
      events: {
        [name]: function (payload) {
          if (handler) return handler(payload);
        },
      },
    });

    return (payload) => broker.emit(name, payload);
  }

  return {
    broker,
    start,
    stop,
    mockAction,
    mockEvent,
  };
}

module.exports = {
  createBrokerHelper,
  // export convenience top-level helpers for backwards compat tests that might import them directly
  createBrokerHelperDefault: (opts) => createBrokerHelper(opts),
};
