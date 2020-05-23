/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 			= require("lodash");
const Middlewares 	= require("./middlewares");
const { BrokerOptionsError } = require("./errors");
const { isObject, isFunction }	= require("./utils");

class MiddlewareHandler {

	constructor(broker) {
		this.broker = broker;

		this.list = [];

		this.registeredHooks = {};
	}

	add(mw) {
		if (!mw) return;

		if (_.isString(mw)) {
			const found = _.get(Middlewares, mw);
			if (!found)
				throw new BrokerOptionsError(`Invalid built-in middleware type '${mw}'.`, { type: mw });
			mw = found;
		}

		if (isFunction(mw))
			mw = mw.call(this.broker, this.broker);

		if (!isObject(mw))
			throw new BrokerOptionsError(`Invalid middleware type '${typeof mw}'. Accepted only Object of Function.`, { type: typeof mw });

		Object.keys(mw).forEach(key => {
			if (isFunction(mw[key])) {
				if (Array.isArray(this.registeredHooks[key]))
					this.registeredHooks[key].push(mw[key]);
				else
					this.registeredHooks[key] = [mw[key]];
			}
		});

		this.list.push(mw);
	}

	/**
	 * Wrap a handler
	 *
	 * @param {string} method
	 * @param {Function} handler
	 * @param {Object} def
	 * @returns {Function}
	 * @memberof MiddlewareHandler
	 */
	wrapHandler(method, handler, def) {
		if (this.registeredHooks[method] && this.registeredHooks[method].length) {
			handler = this.registeredHooks[method].reduce((handler, fn) => {
				return fn.call(this.broker, handler, def);
			}, handler);
		}

		return handler;
	}

	/**
	 * Call a handler asynchronously in all middlewares
	 *
	 * @param {String} method
	 * @param {Array<any>} args
	 * @param {Object} opts
	 * @returns {Promise}
	 * @memberof MiddlewareHandler
	 */
	callHandlers(method, args, opts = {}) {
		if (this.registeredHooks[method] && this.registeredHooks[method].length) {
			const list = opts.reverse ? Array.from(this.registeredHooks[method]).reverse() : this.registeredHooks[method];
			return list.reduce((p, fn) => p.then(() => fn.apply(this.broker, args)), this.broker.Promise.resolve());
		}

		return this.broker.Promise.resolve();
	}

	/**
	 * Call a handler synchronously in all middlewares
	 *
	 * @param {String} method
	 * @param {Array<any>} args
	 * @param {Object} opts
	 * @returns {Array<any}
	 * @memberof MiddlewareHandler
	 */
	callSyncHandlers(method, args, opts = {}) {
		if (this.registeredHooks[method] && this.registeredHooks[method].length) {
			const list = opts.reverse ? Array.from(this.registeredHooks[method]).reverse() : this.registeredHooks[method];
			return list.map(fn => fn.apply(this.broker, args));
		}
		return;
	}

	/**
	 * Get count of registered middlewares
	 *
	 * @returns {Number}
	 * @memberof MiddlewareHandler
	 */
	count() {
		return this.list.length;
	}

	/**
	 * Wrap a method
	 *
	 * @param {string} method
	 * @param {Function} handler
	 * @param {any} bindTo
	 * @param {Object} opts
	 * @returns {Function}
	 * @memberof MiddlewareHandler
	 */
	wrapMethod(method, handler, bindTo = this.broker, opts = {}) {
		if (this.registeredHooks[method] && this.registeredHooks[method].length) {
			const list = opts.reverse ? Array.from(this.registeredHooks[method]).reverse() : this.registeredHooks[method];
			handler = list.reduce((next, fn) => fn.call(bindTo, next), handler.bind(bindTo));
		}

		return handler;
	}

}

module.exports = MiddlewareHandler;

/*
{
    // After broker is created
    created(broker) {
		return;
    },

    // Wrap local action handlers (legacy middleware handler)
    localAction(next, action) {
		return ctx => {
			return next(ctx);
		};
    },

    // Wrap remote action handlers
    remoteAction(next, action) {
		return ctx => {
			return next(ctx);
		};
    },

	// Wrap local event handlers
	localEvent(next, event) {
		return (payload, sender, event) => {
			return next(payload, sender, event);
		};
	},

    // Wrap local method handlers
    localMethod(next, method) {
		return () => {
			return next(...arguments);
		};
	},

	// Wrap broker.createService method
	createService(next) {
		return (schema, schemaMods) => {
			return next(schema, schemaMods);
		};
	},

	// Wrap broker.registerLocalService method
	registerLocalService(next) {
		return (svc) => {
			return next(svc);
		};
	},

	// Wrap broker.destroyService method
	destroyService(next) {
		return (svc) => {
			return next(svc);
		};
	},

	// Wrap broker.call method
	call(next) {
		return (actionName, params, opts) => {
			return next(actionName, params, opts);
		};
	},

	// Wrap broker.mcall method
	mcall(next) {
		return (def) => {
			return next(def);
		};
	},

    // Wrap broker.emit method
    emit(next) {
		return (event, payload) => {
			return next(event, payload);
		};
    },

    // Wrap broker.broadcast method
    broadcast(next) {
		return (event, payload) => {
			return next(event, payload);
		};
    },

    // Wrap broker.broadcastLocal method
    broadcastLocal(next) {
		return (event, payload) => {
			return next(event, payload);
		};
    },

	// While a new local service creating (after mixins are mixed)
	serviceCreating(service, schema) {
		return;
	},

	// After a new local service created
	serviceCreated(service) {
		return;
	},

	// Before a local service started
	serviceStarting(service) {
		return Promise.resolve();
	},

	// After a local service started
	serviceStarted(service) {
		return Promise.resolve();
	},

	// Before a local service stopping
	serviceStopping(service) {
		return Promise.resolve();
	},

	// After a local service stopped
	serviceStopped(service) {
		return Promise.resolve();
	},

    // Before broker starting
    starting(broker) {
		return Promise.resolve();
    },

    // After broker started
    started(broker) {
		return Promise.resolve();
    },

    // Before broker stopping
    stopping(broker) {
		return Promise.resolve();
    },

    // After broker stopped
    stopped(broker) {
		return Promise.resolve();
    },

	// When transit publishing a packet
	transitPublish(next) {
		return (packet) => {
			return next(packet);
		};
	},

	// When transit receives & handles a packet
	transitMessageHandler(next) {
		return (cmd, packet) => {
			return next(cmd, packet);
		};
	},

	// When transporter send data
	transporterSend(next) {
		return (topic, data, meta) => {
			return next(topic, data, meta);
		};
	},

	// When transporter received data
	transporterReceive(next) {
		return (cmd, data, s) => {
			return next(cmd, data, s);
		};
	},

	// When transporter received data
	newLogEntry(type, args, bindings) {
		// Do something
	}
}

*/
