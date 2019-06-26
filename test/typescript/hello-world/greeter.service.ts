"use strict";

import { Service } from "../../../";
import { Context } from "../../../";

type GreeterWelcomeParams = {
	name: string
};

export default class GreeterService extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "greeter",
			actions: {
				hello: this.hello,
				welcome: this.welcome
			}
		});
	}

	/**
	 * Say a 'Hello'
	 *
	 * @returns
	 */
	hello() {
		return "Hello Moleculer TS";
	}

	/**
	 * Welcome a username
	 *
	 * @param {String} name - User name
	 */
	welcome(ctx: Context<GreeterWelcomeParams>) {
		return `Welcome, ${ctx.params ? ctx.params.name : "Anonymous"}!`;
	}
};
