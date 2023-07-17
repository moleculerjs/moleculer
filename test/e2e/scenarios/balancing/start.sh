#!/bin/bash

echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=balancing;

echo "Start balancing scenario...";
node node1.js & \
node node2.js & \
node node3.js & \
node scenario.js

case $TRANSPORTER in
  (NATS|AMQP)
  	export DISABLEBALANCER=true;
	export NAMESPACE=balancing-disabled;
	echo "Start balancing scenario with disabled balancer...";

	node node1.js & \
	node node2.js & \
	node node3.js & \
	node scenario.js
	;;
esac
