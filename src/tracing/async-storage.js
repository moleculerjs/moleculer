"use strict";

const util = require("util");
const asyncHooks = require("async_hooks");
const executionAsyncId = asyncHooks.executionAsyncId;

function log(...args) {
	process._rawDebug(`${util.format(...args)}`);
}

class AsyncStorage {
	constructor() {
		this.broker = null;

		this.hook = asyncHooks.createHook({
			init: this._init.bind(this),
			//before: this._before.bind(this),
			//after: this._after.bind(this),
			destroy: this._destroy.bind(this),
			promiseResolve: this._destroy.bind(this)
		});

		this.executionAsyncId = executionAsyncId;

		this.store = new Map();
	}

	init(broker) {
		this.broker = broker;
		this.hook.enable();
	}

	stop() {
		this.hook.disable();
		this.store.clear();
	}

	getAsyncId() {
		return executionAsyncId();
	}

	setSessionData(data) {
		const currentUid = executionAsyncId();
		this.store.set(currentUid, {
			data,
			owner: currentUid
		});
	}

	getSessionData() {
		const currentUid = executionAsyncId();
		const item = this.store.get(currentUid);
		return item ? item.data : null;
	}

	_init(asyncId, type, triggerAsyncId) {
		// Skip TIMERWRAP type
		if (type === "TIMERWRAP")
			return;

		const item = this.store.get(triggerAsyncId);
		if (item) {
			this.store.set(asyncId, item);
		}
	}

	_destroy(asyncId) {
		const item = this.store.get(asyncId);
		if (item) {
			this.store.delete(asyncId);
			//if (item.owner == asyncId)
			//	item.data = null;
		}
	}
}

module.exports = AsyncStorage;
