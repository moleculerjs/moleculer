/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function debounceMiddleware(broker) {
	function wrapEventDebounceMiddleware(handler, event) {
		if (event.debounce > 0) {
			let timer;

			return function debounceMiddleware(ctx) {
				if (timer) clearTimeout(timer);

				timer = setTimeout(() => {
					timer = null;
					return handler(ctx);
				}, event.debounce);

				return broker.Promise.resolve();
			}.bind(this);
		}
		return handler;
	}

	return {
		name: "Debounce",

		localEvent: wrapEventDebounceMiddleware
	};
};
