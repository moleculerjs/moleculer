/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const BaseStrategy = require("./base");

/**
 * Sharding invocation strategy
 *
 *
 *
 * @class ShardStrategy
 */
class ShardStrategy extends BaseStrategy {

	constructor(registry, broker) {
		super(registry, broker);

		this.opts = _.defaultsDeep(registry.opts.strategyOptions, {
			shardKey: null,
			hash: "crc32" // "md5", Function()
		});
	}

	select(list, ctx) {
		// TODO
		// https://gist.github.com/wqli78/1330293/6d85cc967f32cccfcbad94ae7d088a3dcfc14bd9
	}
}

module.exports = ShardStrategy;
