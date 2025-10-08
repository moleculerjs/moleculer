// packages/testing-helpers/src/index.js
// Minimal testing helpers for Moleculer tests.
// - createBrokerHelper(): crea un broker ligero y retorna helpers enlazados.
// - mockAction(name, handler): registra un servicio/acción para tests.
// - mockEvent(name, handler): registra un listener de evento para tests.

let ServiceBroker;
try {
  // Preferir paquete instalado si existe (normal npm install)
  ({ ServiceBroker } = require("moleculer"));
} catch (err) {
  // Si no está instalado, usar la versión local del repo (subir tres niveles desde packages/testing-helpers/src)
  // Esto hace que los tests que ejecutas en el repo usen el código fuente local.
  ({ ServiceBroker } = require("../../../"));
}

function parseActionName(fullName = "") {
  const idx = fullName.indexOf(".");
  if (idx === -1) return { service: fullName || "__mock__", action: "default" };
  return { service: fullName.slice(0, idx), action: fullName.slice(idx + 1) };
}

function createBrokerHelper(opts = {}) {
  const broker = new ServiceBroker({
    logger: false,
    transporter: null,
    ...opts,
  });

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

  function mockAction(name, handler) {
    const { service, action } = parseActionName(name);

    const actions = {
      [action]: function (ctx) {
        if (!handler) return null;
        // handler can accept ctx or params
        // If handler expects 1 argument, pass ctx; otherwise pass ctx.params
        try {
          return handler.length === 1 ? handler(ctx) : handler(ctx.params);
        } catch (err) {
          throw err;
        }
      },
    };

    broker.createService({
      name: service || "__mock__",
      actions,
    });

    return () => broker.call(name);
  }

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
  createBrokerHelperDefault: (opts) => createBrokerHelper(opts),
};
