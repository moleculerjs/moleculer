/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { isFunction, isString, match } = require("../utils");

module.exports = function actionHookMiddleware(broker) {
	function callHook(hook, service, ctx, res) {
		if (isFunction(hook)) {
			return hook.call(service, ctx, res);
		} else if (Array.isArray(hook)) {
			return hook.reduce(
				(p, fn) => p.then(res => fn.call(service, ctx, res)),
				broker.Promise.resolve(res)
			);
		}
	}

	function callErrorHook(hook, service, ctx, err) {
		if (isFunction(hook)) {
			return hook.call(service, ctx, err);
		} else if (Array.isArray(hook)) {
			return hook.reduce(
				(p, fn) => p.catch(err => fn.call(service, ctx, err)),
				broker.Promise.reject(err)
			);
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
		if (isString(hooks)) return service && isFunction(service[hooks]) ? service[hooks] : null;

		if (Array.isArray(hooks)) {
			return _.compact(
				hooks.map(h => {
					if (isString(h)) return service && isFunction(service[h]) ? service[h] : null;

					return h;
				})
			);
		}

		return hooks;
	}

	function wrapActionHookMiddleware(handler, action) {
		/*if (action.service.name == "hook") {
			console.log("AAA");
		}*/
		const name = action.rawName || action.name;
		const hooks = action.service && action.service.schema ? action.service.schema.hooks : null;
		if (hooks || action.hooks) {
			// Global hooks
			const beforeAllHook =
				hooks && hooks.before ? sanitizeHooks(hooks.before["*"], action.service) : null;
			const afterAllHook =
				hooks && hooks.after ? sanitizeHooks(hooks.after["*"], action.service) : null;
			const errorAllHook =
				hooks && hooks.error ? sanitizeHooks(hooks.error["*"], action.service) : null;

			// Hooks in service
			// Find matching hooks
			const beforeHookMatches =
				hooks && hooks.before
					? Object.keys(hooks.before).filter(hookName => {
							// Global hook. Skip it
							if (hookName === "*") return false;

							return match(name, hookName);
					  })
					: null;

			// Sanitize matching hooks
			const beforeHook =
				beforeHookMatches && beforeHookMatches.length > 0
					? beforeHookMatches.map(hookName =>
							sanitizeHooks(hooks.before[hookName], action.service)
					  )
					: null;

			/*
			const beforeHook =
				hooks && hooks.before ? sanitizeHooks(hooks.before[name], action.service) : null;
			*/
			const afterHook =
				hooks && hooks.after ? sanitizeHooks(hooks.after[name], action.service) : null;

			const errorHook =
				hooks && hooks.error ? sanitizeHooks(hooks.error[name], action.service) : null;

			// Hooks in action definition
			const actionBeforeHook =
				action.hooks && action.hooks.before
					? sanitizeHooks(action.hooks.before, action.service)
					: null;
			const actionAfterHook =
				action.hooks && action.hooks.after
					? sanitizeHooks(action.hooks.after, action.service)
					: null;
			const actionErrorHook =
				action.hooks && action.hooks.error
					? sanitizeHooks(action.hooks.error, action.service)
					: null;

			if (
				beforeAllHook ||
				beforeHook ||
				actionBeforeHook ||
				afterAllHook ||
				afterHook ||
				actionAfterHook ||
				errorAllHook ||
				errorHook ||
				actionErrorHook
			) {
				return function actionHookMiddleware(ctx) {
					let p = broker.Promise.resolve();

					// Before hook all
					if (beforeAllHook) p = p.then(() => callHook(beforeAllHook, ctx.service, ctx));

					// Before hook
					if (beforeHook) {
						// p = p.then(() => callHook(beforeHook, ctx.service, ctx));
						beforeHook.forEach(fnHook => {
							p = p.then(() => callHook(fnHook, ctx.service, ctx));
						});
					}

					// Before hook in action definition
					if (actionBeforeHook)
						p = p.then(() => callHook(actionBeforeHook, ctx.service, ctx));

					// Action hook handler
					p = p.then(() => handler(ctx));

					// After hook in action definition
					if (actionAfterHook)
						p = p.then(res => callHook(actionAfterHook, ctx.service, ctx, res));

					// After hook
					if (afterHook) p = p.then(res => callHook(afterHook, ctx.service, ctx, res));

					// After hook all
					if (afterAllHook)
						p = p.then(res => callHook(afterAllHook, ctx.service, ctx, res));

					// Error hook in action definition
					if (actionErrorHook)
						p = p.catch(err => callErrorHook(actionErrorHook, ctx.service, ctx, err));

					// Error hook
					if (errorHook)
						p = p.catch(err => callErrorHook(errorHook, ctx.service, ctx, err));

					// Error hook all
					if (errorAllHook)
						p = p.catch(err => callErrorHook(errorAllHook, ctx.service, ctx, err));

					return p;
				};
			}
		}

		return handler;
	}

	return {
		name: "ActionHook",
		localAction: wrapActionHookMiddleware
	};
};
