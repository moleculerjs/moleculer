"use strict";

import { Service } from "../../../";
import { Context } from "../../../";
import { ActionHooks, ServiceHooks, ServiceHooksAfter, ServiceSchema } from "../../../";

type GreeterWelcomeParams = {
	name: string
};

export default class GreeterService extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "greeter",
			hooks: {
				before: {
					welcome(ctx: Context<GreeterWelcomeParams>): void {
						// console.log("Service hook \"before\".");
						ctx.params.name = ctx.params.name.toUpperCase();
					}
				},
				after: {
					hello: "anotherHookAfter",
					welcome: [
						function (ctx: Context<GreeterWelcomeParams>, res: any): any {
							// console.log("Service sync hook \"after\".");
							return res;
						},
						async (ctx: Context<GreeterWelcomeParams>, res: any): Promise<any> => {
							// console.log("Service async hook \"after\".");
							return await Promise.resolve(res);
						},
						"anotherHookAfter"
					],
				} as ServiceHooksAfter,
				error: {
					welcome(ctx: Context<GreeterWelcomeParams>, err: Error): void {
						// console.log("Service hook \"error\".");
						throw err;
					}
				}
			} as ServiceHooks,
			actions: {
				hello: {
					handler: this.hello,
					hooks: {
						after: [
							function (ctx: Context<GreeterWelcomeParams>, res: any): any {
								// console.log("Action sync hook \"after\".");
								return res;
							},
							async (ctx: Context<GreeterWelcomeParams>, res: any): Promise<any> => {
								// console.log("Action async hook \"after\".");
								return await Promise.resolve(res);
							},
							"anotherHookAfter"
						]
					} as ActionHooks
				},
				welcome: this.welcome
			}
		} as ServiceSchema);
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
		return `Welcome, ${ctx.params.name}!`;
	}

	async anotherHookAfter(ctx: Context<GreeterWelcomeParams>, res: any): Promise<any> {
		// console.log("Another async hook \"after\".");
		return await Promise.resolve(res);
	}
};
