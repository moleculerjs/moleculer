/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

function callHook(hook, service, ctx, res) {
	if (_.isFunction(hook)) {
		return hook.call(service, ctx, res);
	} else if (Array.isArray(hook)) {
		return hook.reduce((p, fn) => p.then(res => fn.call(service, ctx, res)), Promise.resolve(res));
	}
}

function callErrorHook(hook, service, ctx, err) {
	if (_.isFunction(hook)) {
		return hook.call(service, ctx, err);
	} else if (Array.isArray(hook)) {
		return hook.reduce((p, fn) => p.catch(err => fn.call(service, ctx, err)), Promise.reject(err));
	}
}

/**
 * Sanitize hooks. If the hook is a string, convert it to Service method calling.
 *
 * @param {Function|String|Array<any>} hooks
 * @param {Service?} service
 * @returns
 */
function sanitizeHooks(hooks, service) {
	if (_.isString(hooks))
		return service && _.isFunction(service[hooks]) ? service[hooks] : null;

	if (Array.isArray(hooks)) {
		return _.compact(hooks.map(h => {
			if (_.isString(h))
				return service && _.isFunction(service[h]) ? service[h] : null;

			return h;
		}));
	}

	return hooks;
}

function wrapActionHookMiddleware(handler, action) {
	const name = action.rawName || action.name;
	const hooks = action.service && action.service.schema ? action.service.schema.hooks : null;
	if (hooks) {
		const beforeAllHook = hooks.before ? sanitizeHooks(hooks.before["*"], action.service) : null;
		const afterAllHook = hooks.after ? sanitizeHooks(hooks.after["*"], action.service) : null;
		const errorAllHook = hooks.error ? sanitizeHooks(hooks.error["*"], action.service) : null;

		const beforeHook = hooks.before ? sanitizeHooks(hooks.before[name], action.service) : null;
		const afterHook = hooks.after ? sanitizeHooks(hooks.after[name], action.service) : null;
		const errorHook = hooks.error ? sanitizeHooks(hooks.error[name], action.service) : null;

		if (beforeAllHook || beforeHook || afterAllHook || afterHook || errorAllHook || errorHook) {
			return function actionHookMiddleware(ctx) {
				let p = Promise.resolve();

				// Before all
				if (beforeAllHook)
					p = p.then(() => callHook(beforeAllHook, ctx.service, ctx));

				// Before
				if (beforeHook)
					p = p.then(() => callHook(beforeHook, ctx.service, ctx));

				// Action handler
				p = p.then(() => handler(ctx));

				// After
				if (afterHook)
					p = p.then(res => callHook(afterHook, ctx.service, ctx, res));

				// After all
				if (afterAllHook)
					p = p.then(res => callHook(afterAllHook, ctx.service, ctx, res));

				// Error
				if (errorHook)
					p = p.catch(err => callErrorHook(errorHook, ctx.service, ctx, err));

				// Error all
				if (errorAllHook)
					p = p.catch(err => callErrorHook(errorAllHook, ctx.service, ctx, err));

				return p;
			};
		}
	}

	return handler;
}

module.exports = function actionHookMiddleware() {
	return {
		localAction: wrapActionHookMiddleware
	};
};
