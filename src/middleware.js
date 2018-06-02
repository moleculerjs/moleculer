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
	 * @param {Boolean} reverse
	 * @returns {Promise}
	 * @memberof MiddlewareHandler
	 */
	callHandlers(method, args, reverse = false) {
		if (this.list.length) {
			const list = reverse ? Array.from(this.list).reverse() : this.list;
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
	 * @param {Boolean} reverse
	 * @returns
	 * @memberof MiddlewareHandler
	 */
	callSyncHandlers(method, args, reverse = false) {
		if (this.list.length) {
			const list = reverse ? Array.from(this.list).reverse() : this.list;
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
}

module.exports = MiddlewareHandler;

/*
{
    // After broker is created
    created(broker) {

    },

    // Wrap local action handlers (legacy middleware handler)
    localAction(handler, action) {

    },

    // Wrap remote action handlers
    remoteAction(handler, action) {

    },

	// Wrap local event handlers
	localEvent(handler, event) {

	}

	// Wrap broker.createService method
	createService(next) {

	}

	// Wrap broker.destroyService method
	destroyService(next) {

	}

	// Wrap broker.call method
	call(next) {

	}

	// Wrap broker.mcall method
	mcall(next) {

	}

    // Wrap broker.emit method
    emit(next) {

    },

    // Wrap broker.broadcast method
    broadcast(next) {

    },

    // Wrap broker.broadcastLocal method
    broadcastLocal(next) {

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

}

*/
