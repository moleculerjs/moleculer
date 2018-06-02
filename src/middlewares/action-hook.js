/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Promise = require("bluebird");

/*
	TODO:
		- support array of function hooks
		- hook action name without service name
*/
function wrapActionHookMiddleware(handler, action) {
	const hooks = action.service && action.service.schema &&  action.service.schema.hooks ? action.service.schema.hooks[action.name] : null;
	if (hooks) {
		if (hooks.before || hooks.after || hooks.error) {
			return function actionHookMiddleware(ctx) {
				return Promise.resolve()
					.then(() => hooks.before ? hooks.before.call(ctx.service, ctx) : null)
					.then(() => handler(ctx))
					.then(res => hooks.after ? hooks.after.call(ctx.service, ctx, res) : res)
					.catch(err => hooks.error ? hooks.error.call(ctx.service, ctx, err) : Promise.reject(err));
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
