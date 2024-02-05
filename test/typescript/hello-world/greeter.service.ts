"use strict";

import { Service } from "../../../";
import { Context } from "../../../";
import { ServiceSettingSchema, ServiceSchema } from "../../../";

export interface ActionHelloParams {
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
			handler(this: GreeterThis/* , ctx: Context */): string {
				return `Hello ${this.settings.defaultName}`;
			},
		},

		welcome: {
			rest: "GET /welcome/:name",
			params: {
				name: "string",
			},
			handler(this: GreeterThis, ctx: Context<ActionHelloParams>): string {
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
	methods: {},

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
