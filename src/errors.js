/**
 * 'Service not found' Error message
 * 
 * @class ServiceNotFoundError
 * @extends {Error}
 */
class ServiceNotFoundError extends Error {
	/**
	 * Creates an instance of ServiceNotFoundError.
	 * 
	 * @param {any} message
	 * @param {any} data
	 * 
	 * @memberOf ServiceNotFoundError
	 */
	constructor(message, data) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = "ServiceNotFoundError";
		this.message = message;
		if (data) {
			this.data = data;
		}
	}
}

module.exports = {
	ServiceNotFoundError
};