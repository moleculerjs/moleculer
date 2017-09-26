/* eslint-disable no-console */

"use strict";

const amqp = require("amqplib");

module.exports = function({ queues, exchanges }) {

	let connectionRef;

	return amqp.connect(process.env.AMQP_URI || "amqp://guest:guest@localhost:5672")
		.then(connection => {
			//console.info("AMQP connected!");
			connectionRef = connection;
			return connection
				.on("error", (err) => {
					console.error("AMQP connection error!", err);
				})
				.on("close", (err) => {
					//const crashWorthy = require("amqplib/lib/connection").isFatalError(err);
					//console.error("AMQP connection closed!", crashWorthy && err ||  "");
				})
				.createChannel();
		})
		.then((channel) => {
			//console.info("AMQP channel created!");
			channel
				.on("close", () => {
					//console.warn("AMQP channel closed!");
				})
				.on("error", (error) => {
					console.error("AMQP channel error!", error);
				});

			return Promise.all(queues.map(q => channel.deleteQueue(q)))
				.then(() => Promise.all(exchanges.map(e => channel.deleteExchange(e))));
		})
		.then(() => {
			//console.log("Done.");
			return connectionRef.close();
		})
		.catch((err) => {
			console.error("AMQP failed to create channel!", err);
		});
};
