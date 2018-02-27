/* eslint-disable no-console */

let nc1 = require("nats").connect();
let nc2 = require("nats").connect();

///////////////////////////////////////
// Publish/Subscribe Performance
///////////////////////////////////////

let loop = 50000;
let hash = 2500;

console.log("Publish/Subscribe Performance Test");

nc1.on("connect", function () {
	let work1 = function () {
		let received = 0;
		let start = new Date();

		let sid = nc1.subscribe("test", function () {
			received += 1;

			if (received === loop) {
				let stop = new Date();
				let mps = parseInt(loop / ((stop - start) / 1000));
				console.log("\nPublished/Subscribe at " + mps + " msgs/sec");
				console.log("Received " + received + " messages");
				nc1.unsubscribe(sid);
				setImmediate(work1);
			}
		});

		// Make sure sub is registered
		nc1.flush(function () {
			for (let i = 0; i < loop; i++) {
				nc2.publish("test", "ok");
				if (i % hash === 0) {
					process.stdout.write("+");
				}
			}
		});

	};

	let work2 = function() {
		let received = 0;
		let start = new Date();

		nc1.subscribe("ping", msg => {
			nc1.publish("pong", "ok");
		});

		nc1.flush(() => {
			let doWork = function() {
				nc2.publish("ping", "ok");
			};

			nc2.subscribe("pong", () => {
				received += 1;

				if (received >= loop) {
					let stop = new Date();
					let mps = parseInt(loop / ((stop - start) / 1000));
					console.log("\nPublished/Subscribe at " + mps + " msgs/sec");
					console.log("Received " + received + " messages");
					received = 0;
					start = new Date();
				}
				doWork();
			});
			nc2.flush(() => {
				doWork();
			});
		});
	};

	let work3 = function () {
		let received = 0;
		let start = new Date();

		let sid = nc1.subscribe("test", function (data, reply) {
			nc1.publish(reply, "ok");
		});

		// Make sure sub is registered
		nc1.flush(function () {
			for (let i = 0; i < loop; i++) {
				nc2.request("test", "ok", {max:1}, () => {
					received += 1;

					if (received % hash === 0) {
						process.stdout.write(".");
					}

					if (received === loop) {
						let stop = new Date();
						let mps = parseInt(loop / ((stop - start) / 1000));
						console.log("\nPublished/Subscribe at " + mps + " msgs/sec");
						console.log("Received " + received + " messages");
						nc1.unsubscribe(sid);
						setImmediate(work3);
					}
				});
				if (i % hash === 0) {
					process.stdout.write("+");
				}
			}
		});

	};

	work1();
	//work2();
	//work3();


});
