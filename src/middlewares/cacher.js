/*
 * moleculer
 * Copyright (c) 2021 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = function CacherMiddleware(broker) {
	return broker.cacher ? broker.cacher.middleware() : null;
};
