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
	 * Wrap local action handler
	 *
	 * @param {Action} action
	 * @param {Function} handler
	 * @returns {Function}
	 * @memberof MiddlewareHandler
	 */
	wrapLocalAction(action, handler) {
		return this.wrapActionHandler("localAction", action, handler);
	}

	/**
	 * Wrap remote action handler
	 *
	 * @param {Action} action
	 * @param {Function} handler
	 * @returns {Function}
	 * @memberof MiddlewareHandler
	 */
	wrapRemoteAction(action, handler) {
		return this.wrapActionHandler("remoteAction", action, handler);
	}

	/**
	 * Wrap an action handler
	 *
	 * @param {string} method
	 * @param {ActionDef} action
	 * @param {Function} handler
	 * @returns {Function}
	 * @memberof MiddlewareHandler
	 */
	wrapActionHandler(method, action, handler) {
		if (this.list.length) {
			handler = this.list.reduce((handler, mw) => {
				if (_.isFunction(mw[method]))
					return mw[method].call(this.broker, handler, action);
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
	 * @param {Boolean} revert
	 * @returns {Promise}
	 * @memberof MiddlewareHandler
	 */
	callHandlers(method, args, revert = false) {
		if (this.list.length) {
			const list = revert ? Array.from(this.list).reverse() : this.list;
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
	 * @param {Boolean} revert
	 * @returns
	 * @memberof MiddlewareHandler
	 */
	callSyncHandlers(method, args, revert = false) {
		if (this.list.length) {
			const list = revert ? Array.from(this.list).reverse() : this.list;
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

    // Wrap local action calls (legacy middleware handler)
    localAction(handler, action) {

    },

    // Wrap remote action calls
    remoteAction(handler, action) {

    },

    // When event is emitted
    emit(eventName, payload) {

    },

    // When broadcast event is emitted
    broadcast(eventName, payload, groups) {

    },

    // When local broadcast event is emitted
    broadcastLocal(eventName, payload, groups) {

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
