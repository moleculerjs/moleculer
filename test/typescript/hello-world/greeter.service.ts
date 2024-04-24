"use strict";

import { Service } from "../../../";
import { Context } from "../../../";
import { ServiceSettingSchema, ServiceSchema } from "../../../";

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

type GreeterThis = Service<GreeterSettings> & GreeterMethods & GreeterLocalVars;

const GreeterService: ServiceSchema<GreeterSettings, GreeterThis> = {
	name: "greeter",

	/**
	 *  Hooks
	 */
	hooks: {
		before: {
			welcome(this: GreeterThis, ctx: Context<ActionWelcomeParams>): void {
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
				async (ctx: Context<ActionWelcomeParams>, res: any): Promise<any> => {
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
			handler(this: GreeterThis, ctx: Context): string {
				return `Hello ${this.settings.defaultName}`;
			},
			hooks: {
				after: [
					(ctx: Context, res: any): any => {
						// console.log(`Action sync hook "after".`);
						return res;
					},
					async (ctx: Context, res: any): Promise<any> => {
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
			handler(this: GreeterThis, ctx: Context<ActionWelcomeParams>): string {
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
		uppercase(this: GreeterThis, str: string): string {
			return str.toUpperCase();
		},

		async anotherHookAfter(this: GreeterThis, ctx: Context, res: any): Promise<void> {
			return await Promise.resolve(res);
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created(this: GreeterThis) {
		this.logger.info(`${this.name} service - lifecycle method "created" called.`);
	},

	/**
	 * Service started lifecycle event handler
	 */
	async started(this: GreeterThis) {
		this.logger.info(`${this.name} service - lifecycle method "started" called.`);
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped(this: GreeterThis) {
		this.logger.info(`${this.name} service - lifecycle method "stopped" called.`);
	},
};

export default GreeterService;
