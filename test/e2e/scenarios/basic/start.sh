#!/bin/sh

echo "Start basic scenario...";
echo "Transporter: $TRANSPORTER";
export NAMESPACE=basic;
node node1.js & \
node scenario.js
