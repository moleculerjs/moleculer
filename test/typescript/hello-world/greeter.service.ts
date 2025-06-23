"use strict";

import { Context, ServiceSettingSchema, ServiceSchema } from "../../../";

declare module "../../../src/service" {
	interface ActionSchema {
		rest?: string | {
			method?: string;
			path?: string;
		}
	}
}

export interface ActionWelcomeParams {
	name: string;
}

interface GreeterSettings extends ServiceSettingSchema {
	defaultName: string;
}

interface GreeterMethods {
	uppercase(str: string): string;
}

interface GreeterLocalVars {
	myVar: string;
}

const GreeterService: ServiceSchema<GreeterSettings, GreeterMethods & GreeterLocalVars> = {
	name: "greeter",

	/**
	 *  Hooks
	 */
	hooks: {
		before: {
			welcome(ctx: Context<ActionWelcomeParams>): void {
				// console.log(`Service hook "before".`);
				ctx.params.name = this.uppercase(ctx.params.name);
			}
		},
		after: {
			hello: "anotherHookAfter",
			welcome: [
				function (ctx: Context<ActionWelcomeParams>, res: any): any {
					// console.log(`Service sync hook "after".`);
					return res;
				},
				async function (ctx: Context<ActionWelcomeParams>, res: any): Promise<any> {
					// console.log(`Service async hook "after".`);
					return await Promise.resolve(res);
				},
				"anotherHookAfter"
			],
		},
		error: {
			welcome(ctx: Context<ActionWelcomeParams>, err: Error): void {
				// console.log(`Service hook "error".`);
				throw err;
			}
		}
	},

	/**
	 * Settings
	 */
	settings: {
		defaultName: "Moleculer",
	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		hello: {
			rest: {
				method: "GET",
				path: "/hello",
			},
			handler(ctx: Context): string {
				return `Hello ${this.settings.defaultName}`;
			},
			hooks: {
				after: [
					function (ctx: Context, res: any): any {
						// console.log(`Action sync hook "after".`);
						return res;
					},
					async function (ctx: Context, res: any): Promise<any> {
						// console.log(`Action async hook "after".`);
						return await Promise.resolve(res);
					},
					"anotherHookAfter"
				]
			}
		},

		welcome: {
			rest: "GET /welcome/:name",
			params: {
				name: "string",
			},
			handler(ctx: Context<ActionWelcomeParams>): string {
				return `Welcome, ${ctx.params.name}`;
			},
		},
	},

	/**
	 * Events
	 */
	events: {},

	/**
	 * Methods
	 */
	methods: {
		uppercase(str: string): string {
			return str.toUpperCase();
		},

		async anotherHookAfter(ctx: Context, res: any): Promise<void> {
			return await Promise.resolve(res);
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.logger.info(`${this.name} service - lifecycle method "created" called.`);
	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
		this.logger.info(`${this.name} service - lifecycle method "started" called.`);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {
		this.logger.info(`${this.name} service - lifecycle method "stopped" called.`);
	},
};

export default GreeterService;
