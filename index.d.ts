declare class Context {

	constructor(opts: any);

	createSubContext(service: any, action: string, params: any);

	setParams(newParams: any);

	emit(eventName: string, data: any);

	closeContext();

	result(data: any);

	error(err: any);

	call(actionName: string, params: any);

	log(str: string, params: any);

}

export = Context;