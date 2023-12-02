/*
 * moleculer
 * Copyright (c) 2023 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

/* eslint-disable no-unused-vars */

"use strict";

const _ = require("lodash");
const crypto = require("crypto");
const { METRIC } = require("../metrics");
const { isObject, isFunction, isDate } = require("../utils");

/**
 * Import types
 *
 * @typedef {import("../service-broker")} ServiceBroker
 * @typedef {import("../context")} Context
 * @typedef {import("./base").CacherOptions} CacherOptions
 * @typedef {import("./base")} CacherBaseClass
 */

/**
 * Abstract cacher class
 *
 * @implements {CacherBaseClass}
 */
class Cacher {
	/**
	 * Creates an instance of Cacher.
	 *
	 * @param {object} opts
	 *
	 * @memberof Cacher
	 */
	constructor(opts) {
		/** @type {CacherOptions} */
		this.opts = _.defaultsDeep(opts, {
			ttl: null,
			keygen: null,
			maxParamsLength: null,
			missingResponse: undefined
		});

		/** @type {boolean} Flag indicating the connection status */
		this.connected = null; // Init as null for backward compatibility
	}

	/**
	 * Initialize cacher
	 *
	 * @param {ServiceBroker} broker
	 *
	 * @memberof Cacher
	 */
	init(broker) {
		this.broker = broker;
		this.metrics = broker.metrics;

		if (this.broker) {
			this.logger = broker.getLogger("cacher");

			if (this.opts.prefix) {
				this.prefix = this.opts.prefix + "-";
			} else {
				this.prefix = "MOL-";
				if (this.broker.namespace) this.prefix += this.broker.namespace + "-";
			}

			this.registerMoleculerMetrics();
		}
	}

	/**
	 * Register Moleculer Transit Core metrics.
	 */
	registerMoleculerMetrics() {
		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_GET_TOTAL,
			type: METRIC.TYPE_COUNTER,
			rate: true
		});
		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_GET_TIME,
			type: METRIC.TYPE_HISTOGRAM,
			quantiles: true,
			unit: METRIC.UNIT_MILLISECONDS
		});

		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_FOUND_TOTAL,
			type: METRIC.TYPE_COUNTER,
			rate: true
		});

		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_SET_TOTAL,
			type: METRIC.TYPE_COUNTER,
			rate: true
		});
		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_SET_TIME,
			type: METRIC.TYPE_HISTOGRAM,
			quantiles: true,
			unit: METRIC.UNIT_MILLISECONDS
		});

		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_DEL_TOTAL,
			type: METRIC.TYPE_COUNTER,
			rate: true
		});
		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_DEL_TIME,
			type: METRIC.TYPE_HISTOGRAM,
			quantiles: true,
			unit: METRIC.UNIT_MILLISECONDS
		});

		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_CLEAN_TOTAL,
			type: METRIC.TYPE_COUNTER,
			rate: true
		});
		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_CLEAN_TIME,
			type: METRIC.TYPE_HISTOGRAM,
			quantiles: true,
			unit: METRIC.UNIT_MILLISECONDS
		});

		this.metrics.register({
			name: METRIC.MOLECULER_CACHER_EXPIRED_TOTAL,
			type: METRIC.TYPE_COUNTER,
			rate: true
		});
	}

	/**
	 * Close cacher
	 *
	 * @memberof Cacher
	 */
	close() {
		/* istanbul ignore next */
		return Promise.resolve();
	}

	/**
	 * Get a cached content by key
	 *
	 * @param {any} key
	 *
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	get(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Get a cached content and ttl by key
	 *
	 * @param {any} key
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	getWithTTL(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Set a content by key to cache
	 *
	 * @param {any} key
	 * @param {any} data
	 * @param {Number?} ttl
	 *
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	set(key, data, ttl) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Delete a content by key from cache
	 *
	 * @param {string|Array<string>} key
	 *
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	del(key) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Clean cache. Remove every key by match
	 * /@param {string|Array<string>} match string. Default is "**"
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	clean(/*match = "**"*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Try to acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {number?} ttl
	 *
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	tryLock(key, ttl) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Acquire a lock
	 *
	 * @param {string|Array<string>} key
	 * @param {number?} ttl
	 *
	 * @returns {Promise<any>}
	 * @memberof Cacher
	 */
	lock(key, ttl) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	/**
	 * Get a value from params or meta by `key`.
	 * If the key starts with `#` it reads from `meta`.
	 * If the key starts with `@` it reads from `headers`.
	 *
	 * @param {String} key
	 * @param {Object} params
	 * @param {Object} meta
	 * @param {Object} headers
	 * @returns {any}
	 * @memberof Cacher
	 */
	_getParamMetaValue(key, params, meta, headers) {
		if (key.startsWith("#") && meta != null) return _.get(meta, key.slice(1));
		if (key.startsWith("@") && headers != null) return _.get(headers, key.slice(1));
		else if (params != null) return _.get(params, key);
	}

	/**
	 * Default cache key generator
	 *
	 * @param {Object} action
	 * @param {Object} opts
	 * @param {Context} ctx
	 * @returns {String}
	 * @memberof Cacher
	 */
	defaultKeygen(action, opts, ctx) {
		if (!action) return undefined;

		const { params, meta, headers } = ctx ?? {};

		if (params || meta || headers) {
			const keyPrefix = action.name + ":";
			if (opts?.keys) {
				if (opts.keys.length == 1) {
					// Fast solution for ['id'] key
					const val = this._getParamMetaValue(opts.keys[0], params, meta, headers);
					return keyPrefix + this._hashedKey(this._generateKeyFromObject(val));
				}

				if (opts.keys.length > 0) {
					return (
						keyPrefix +
						this._hashedKey(
							opts.keys.reduce((a, key, i) => {
								const val = this._getParamMetaValue(key, params, meta, headers);
								const valKey = this._generateKeyFromObject(val);
								return (
									a +
									(i ? "|" : "") +
									(isObject(val) || Array.isArray(val)
										? this._hashedKey(valKey)
										: valKey)
								);
							}, "")
						)
					);
				}
			} else {
				return keyPrefix + this._hashedKey(this._generateKeyFromObject(params));
			}
		}
		return action.name;
	}

	/**
	 *  Hash key if it's too long.
	 *
	 * @param {String} key
	 * @returns {String}
	 */
	_hashedKey(key) {
		const maxParamsLength = this.opts.maxParamsLength;
		if (!maxParamsLength || maxParamsLength < 44 || key.length <= maxParamsLength) return key;

		const prefixLength = maxParamsLength - 44;

		const base64Hash = crypto.createHash("sha256").update(key).digest("base64");
		if (prefixLength < 1) return base64Hash;

		return key.substring(0, prefixLength) + base64Hash;
	}

	_generateKeyFromObject(obj) {
		if (Array.isArray(obj)) {
			return "[" + obj.map(o => this._generateKeyFromObject(o)).join("|") + "]";
		} else if (isDate(obj)) {
			return obj.valueOf();
		} else if (isObject(obj)) {
			return Object.keys(obj)
				.map(key => [key, this._generateKeyFromObject(obj[key])].join("|"))
				.join("|");
		} else if (typeof obj === "string") {
			return '"' + obj + '"';
		} else if (obj != null) {
			return obj.toString();
		} else if (obj === null) {
			return "null";
		} else {
			return "undefined";
		}
	}

	/**
	 * Get a cache key by name and params.
	 * Concatenate the name and the hashed params object
	 *
	 * @param {Object} action
	 * @param {Object} opts
	 * @param {Context} ctx
	 * @returns {String}
	 */
	getCacheKey(action, opts, ctx) {
		if (opts && isFunction(opts.keygen)) return opts.keygen.call(this, action, opts, ctx);
		else if (isFunction(this.opts.keygen))
			return this.opts.keygen.call(this, action, opts, ctx);
		else return this.defaultKeygen(action, opts, ctx);
	}

	/**
	 * Register cacher as a middleware
	 *
	 * @memberof Cacher
	 */
	middleware() {
		return {
			name: "Cacher",
			localAction: (handler, action) => {
				const opts = _.defaultsDeep(
					{},
					isObject(action.cache) ? action.cache : { enabled: !!action.cache }
				);
				opts.lock = _.defaultsDeep(
					{},
					isObject(opts.lock) ? opts.lock : { enabled: !!opts.lock }
				);

				if (opts.enabled !== false) {
					const isEnabledFunction = isFunction(opts.enabled);

					return function cacherMiddleware(ctx) {
						if (isEnabledFunction) {
							if (!opts.enabled.call(ctx.service, ctx)) {
								// Cache is disabled. Call the handler only.
								return handler(ctx);
							}
						}

						// Disable caching with `ctx.meta.$cache = false`
						if (ctx.meta["$cache"] === false) return handler(ctx);

						// Cache is enabled but not in healthy state
						// More info: https://github.com/moleculerjs/moleculer/issues/978
						if (this.connected === false) {
							this.logger.debug(
								"Cacher is enabled but it is not connected at the moment... Calling the handler"
							);
							return handler(ctx);
						}

						const cacheKey = this.getCacheKey(action, opts, ctx);

						// Using lock
						if (opts.lock.enabled !== false) {
							return this.middlewareWithLock(ctx, cacheKey, handler, opts);
						} else {
							// Not using lock
							return this.middlewareWithoutLock(ctx, cacheKey, handler, opts);
						}
					}.bind(this);
				}

				return handler;
			}
		};
	}

	/**
	 * Middleware functionality with lock support.
	 *
	 * @param {Context} ctx
	 * @param {string} cacheKey
	 * @param {Function} handler
	 * @param {Object} opts
	 * @returns {Promise<any>}
	 */
	middlewareWithLock(ctx, cacheKey, handler, opts) {
		let cachePromise;
		if (opts.lock.staleTime && this.getWithTTL) {
			// If enable cache refresh
			cachePromise = this.getWithTTL(cacheKey).then(({ data, ttl }) => {
				if (data != null) {
					if (opts.lock.staleTime && ttl && ttl < opts.lock.staleTime) {
						// Cache is stale, try to refresh it.
						this.tryLock(cacheKey, opts.lock.ttl)
							.then(unlock => {
								return handler(ctx)
									.then(result => {
										// Save the result to the cache and release the lock.
										return this.set(cacheKey, result, opts.ttl).then(() =>
											unlock()
										);
									})
									.catch((/*err*/) => {
										return this.del(cacheKey).then(() => unlock());
									});
							})
							.catch((/*err*/) => {
								// The cache is refreshing on somewhere else.
							});
					}
				}
				return data;
			});
		} else {
			cachePromise = this.get(cacheKey);
		}

		return cachePromise.then(data => {
			if (data !== this.opts.missingResponse) {
				// Found in the cache! Don't call handler, return with the content
				ctx.cachedResult = true;
				return data;
			}
			// Not found in the cache! Acquire a lock
			return this.lock(cacheKey, opts.lock.ttl).then(unlock => {
				return this.get(cacheKey).then(content => {
					if (content != null) {
						// Cache found. Realse the lock and return the value.
						ctx.cachedResult = true;
						return unlock().then(() => {
							return content;
						});
					}
					// Call the handler
					return handler(ctx)
						.then(result => {
							// Save the result to the cache and realse the lock.
							this.set(cacheKey, result, opts.ttl).then(() => unlock());
							return result;
						})
						.catch(e => {
							return unlock().then(() => {
								return Promise.reject(e);
							});
						});
				});
			});
		});
	}

	/**
	 * Middleware functionality without lock support.
	 *
	 * @param {Context} ctx
	 * @param {string} cacheKey
	 * @param {Function} handler
	 * @param {Object} opts
	 * @returns {Promise<any>}
	 */
	middlewareWithoutLock(ctx, cacheKey, handler, opts) {
		return this.get(cacheKey).then(content => {
			if (content !== this.opts.missingResponse) {
				// Found in the cache! Don't call handler, return with the content
				ctx.cachedResult = true;
				return content;
			}

			// Call the handler
			return handler(ctx).then(result => {
				// Save the result to the cache
				this.set(cacheKey, result, opts.ttl);

				return result;
			});
		});
	}

	/**
	 * Return all cache keys with available properties (ttl, lastUsed, ...etc).
	 *
	 * @returns {Promise<Array<Object>>}
	 */
	getCacheKeys() {
		// Not available
		return Promise.resolve(null);
	}
}

module.exports = Cacher;
