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
		- support array of function hooks
		- hook action name without service name
*/

function callHook(hook, service, ctx, res) {
	if (_.isFunction(hook)) {
		return hook.call(service, ctx, res);
	} else if (Array.isArray(hook)) {
		return hook.reduce((p, fn) => p.then(res => fn.call(service, ctx, res)), Promise.resolve(res));
	}
}

function wrapActionHookMiddleware(handler, action) {
	const hooks = action.service && action.service.schema &&  action.service.schema.hooks ? action.service.schema.hooks[action.rawName || action.name] : null;
	if (hooks) {
		if (hooks.before || hooks.after || hooks.error) {
			return function actionHookMiddleware(ctx) {
				return Promise.resolve()
					.then(() => hooks.before ? callHook(hooks.before, ctx.service, ctx) : null)
					.then(() => handler(ctx))
					.then(res => hooks.after ? callHook(hooks.after, ctx.service, ctx, res) : res)
					.catch(err => hooks.error ? callHook(hooks.error, ctx.service, ctx, err) : Promise.reject(err));
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
