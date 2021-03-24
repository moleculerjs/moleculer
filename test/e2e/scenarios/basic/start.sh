#!/bin/sh

echo "Start basic scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
export NAMESPACE=basic;
node node1.js & \
node scenario.js
