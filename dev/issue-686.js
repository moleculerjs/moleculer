const { Service, ServiceBroker } = require("../");

class TestMixin extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "mixin",
			actions: {
				hello: this.hello
			}
		});
	}

	hello() {
		return "hi";
	}
}

class MyService1 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test1",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService2 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test2",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService3 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test3",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService4 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test4",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService5 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test5",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService6 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test6",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService7 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test7",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService8 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test8",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService9 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test9",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

class MyService10 extends Service {
	constructor(broker) {
		super(broker);

		this.parseServiceSchema({
			name: "test10",
			mixins: [new TestMixin(this.broker).schema]
		});
	}
}

const broker = new ServiceBroker();

console.log("Creating 1...");
broker.createService(MyService1);
console.log("Creating 2...");
broker.createService(MyService2);
console.log("Creating 3...");
broker.createService(MyService3);
console.log("Creating 4...");
broker.createService(MyService4);
console.log("Creating 5...");
broker.createService(MyService5);
console.log("Creating 6...");
broker.createService(MyService6);
console.log("Creating 7...");
broker.createService(MyService7);
console.log("Creating 8...");
broker.createService(MyService8);
console.log("Creating 9...");
broker.createService(MyService9);
console.log("Creating 10...");
broker.createService(MyService10);
console.log("Done");

broker.start()
	.then(async () => {
		broker.repl();

		const res = await broker.call("test1.hello");
		console.log(res);
	});
