/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

class MiddlewareHandler {

	constructor(broker) {
		this.broker = broker;

		this.list = [];
	}

	add(mw) {
		if (!mw) return;

		if (_.isFunction(mw)) {
			// Backward compatibility
			mw = {
				localAction: mw
			};
		}

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
		if (this.list.length) {
			handler = this.list.reduce((handler, mw) => {
				if (_.isFunction(mw[method]))
					return mw[method].call(this.broker, handler, def);
				else
					return handler;
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
		if (this.list.length) {
			const list = opts.reverse ? Array.from(this.list).reverse() : this.list;
			const arr = list
				.filter(mw => _.isFunction(mw[method]))
				.map(mw => mw[method]);

			if (arr.length)
				return arr.reduce((p, fn) => p.then(() => fn.apply(this.broker, args)), Promise.resolve());
		}

		return Promise.resolve();
	}

	/**
	 * Call a handler synchronously in all middlewares
	 *
	 * @param {String} method
	 * @param {Array<any>} args
	 * @param {Object} opts
	 * @returns
	 * @memberof MiddlewareHandler
	 */
	callSyncHandlers(method, args, opts = {}) {
		if (this.list.length) {
			const list = opts.reverse ? Array.from(this.list).reverse() : this.list;
			list
				.filter(mw => _.isFunction(mw[method]))
				.map(mw => mw[method])
				.forEach(fn => fn.apply(this.broker, args));
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
		if (this.list.length) {
			const list = (opts.reverse ? Array.from(this.list).reverse() : this.list).filter(mw => !!mw[method]);
			if (list.length > 0) {
				handler = list.reduce((next, mw) => mw[method].call(bindTo, next), handler.bind(bindTo));
			}
		}

		return handler;
	}
}

module.exports = MiddlewareHandler;

/*
{
    // After broker is created
    created(broker) {

    },

    // Wrap local action handlers (legacy middleware handler)
    localAction(next, action) {

    },

    // Wrap remote action handlers
    remoteAction(next, action) {

    },

	// Wrap local event handlers
	localEvent(next, event) {

	},

	// Wrap broker.createService method
	createService(next) {

	},

	// Wrap broker.registerLocalService method
	registerLocalService(next) {

	},

	// Wrap broker.destroyService method
	destroyService(next) {

	},

	// Wrap broker.call method
	call(next) {

	},

	// Wrap broker.mcall method
	mcall(next) {

	},

    // Wrap broker.emit method
    emit(next) {

    },

    // Wrap broker.broadcast method
    broadcast(next) {

    },

    // Wrap broker.broadcastLocal method
    broadcastLocal(next) {

    },

	// While a new local service creating (after mixins are mixed)
	serviceCreating(service, schema) {

	},

	// After a new local service created
	serviceCreated(service) {

	},

	// Before a local service started
	serviceStarting(service) {

	},

	// After a local service started
	serviceStarted(service) {

	},

	// Before a local service stopping
	serviceStopping(service) {

	},

	// After a local service stopped
	serviceStopped(service) {

	},

    // Before broker starting
    starting(broker) {

    },

    // After broker started
    started(broker) {

    },

    // Before broker stopping
    stopping(broker) {

    },

    // After broker stopped
    stopped(broker) {

    },

	// When transit publishing a packet
	transitPublish(next) {

	},

	// When transit subscribe to a topic
	transitSubscribe(next) {

	},

	// When transit receives & handles a packet
	transitMessageHandler(next) {

	},

	// When transporter send data
	transporterSend(next) {

	},

	// When transporter received data
	transporterReceive(next) {

	}
}

*/
