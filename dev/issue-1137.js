const ServiceBroker = require("../src/service-broker");
const BaseValidator = require("../").Validators.Base;
const { ValidationError } = require("../").Errors;
const Joi = require("joi");

const _ = require("lodash");

class JoiValidator extends BaseValidator {
	constructor() {
		super();

		this.Joi = require("joi");
	}

	compile(schema) {
		//Check if schema is joi format
		if (this.Joi.isSchema(schema)) {
			return params => this.validate(params, schema);
		} else if (this.validator) {
			//Use fastest-validator
			return this.validator.compile(_.cloneDeep(schema));
		}
	}

	/**
	 * Clean messages
	 * From "\"name\" is required"
	 * to "name is required"
	 * @param {string} msg
	 * @returns {string}
	 */
	cleanMessage(msg) {
		if (!msg) return "";

		return _.replace(msg, /([^\w\d\s])+/g, "");
	}

	/**
	 * Validate joi schema
	 * @param {Object} params
	 * @param {*} schema
	 * @returns
	 */
	validate(params, schema) {
		let errors = [];

		if (!this.Joi.isSchema(schema) && _.isFunction(schema)) {
			throw new ValidationError("Not Joi Schema", null, {
				message: "No Schema Joi"
			});
		}

		// Check if is merged schema
		if (_.get(params, "body", null)) {
			params = params.body;
		}

		//Validate schema
		const { error } = schema.validate(params, {
			abortEarly: true
		});

		if (!_.isEmpty(error)) {
			/**
			 * Create Custom Error
			 */
			if (error.details) {
				_.forEach(error.details, value => {
					let errorObj = {
						type: null,
						field: null,
						uid: null,
						message: null
					};

					//Assign type
					if (value.type) {
						errorObj.type = value.type;
					}

					//Assign field name
					if (value.context) {
						errorObj.field = value.context.key;
					}

					//Assign message error
					if (value.message) {
						errorObj.message = this.cleanMessage(value.message);
					}

					//Create uid
					if (errorObj.type && errorObj.field) {
						errorObj.uid = `${errorObj.field}.${errorObj.type}`;
					}

					errors.push(errorObj);
				});
			}

			/**
			 * Return errors
			 */
			if (error) {
				throw new ValidationError(this.cleanMessage(error.message), null, errors);
			}
		}

		return true;
	}
}

const broker = new ServiceBroker({
	validator: new JoiValidator()
});

broker.createService({
	name: "test",
	actions: {
		hello: {
			params: Joi.object({
				name: Joi.string().required()
			}),
			handler(ctx) {
				return "Hello " + ctx.params.name;
			}
		}
	}
});

broker.start().then(() => {
	broker.repl();
});
