class ServiceNotFoundError extends Error {
	constructor(message, data) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = "ServiceNotFoundError";
		this.message = message;
		if (data) 
			this.data = data;
	}
}

module.exports = {
	ServiceNotFoundError
};