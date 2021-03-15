"use strict";

const ServiceMixin = {
	events: {
		"user.created": {
			async handler(ctx) {
				await this.Promise.delay(100);
				await this.myMethod2(ctx.params);
			}
		}
	}
};

module.exports = {
	name: "greeter",
	mixins: [ServiceMixin],

	/**
	 * Service settings
	 */
	settings: {

	},

	/**
	 * Service dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {

		/**
		 * Say a 'Hello'
		 *
		 * @returns
		 */
		hello() {
			return "Hello Moleculer";
		},

		/**
		 * Welcome a username
		 *
		 * @param {String} name - User name
		 */
		welcome: {
			params: {
				name: "string"
			},
			handler(ctx) {
				return `Welcome, ${ctx.params.name}`;
			}
		}
	},

	/**
	 * Events
	 */
	events: {
		"user.created": {
			async handler(ctx) {
				await this.Promise.delay(500);
				await this.myMethod(ctx.params);
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		async myMethod(ctx) {
			this.logger.info("My method has been called.", ctx.params);
		},

		async myMethod2(ctx) {
			this.logger.info("My method #2 has been called.", ctx.params);
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {

	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
