/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");
const _ = require("lodash");

/*
	TODO:
		- add hooks to service mixin merge
*/

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

function wrapActionHookMiddleware(handler, action) {
	const name = action.rawName || action.name;
	const hooks = action.service && action.service.schema ? action.service.schema.hooks : null;
	if (hooks) {
		const beforeAllHook = hooks.before ? hooks.before["*"] : null;
		const afterAllHook = hooks.after ? hooks.after["*"] : null;
		const errorAllHook = hooks.error ? hooks.error["*"] : null;

		const beforeHook = hooks.before ? hooks.before[name] : null;
		const afterHook = hooks.after ? hooks.after[name] : null;
		const errorHook = hooks.error ? hooks.error[name] : null;

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
