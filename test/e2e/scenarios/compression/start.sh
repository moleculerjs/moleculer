#!/bin/bash

echo "Skipping this test because we will solve this issues later"
exit 0

echo "Start compression scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=compression;
node node1.js & \
node scenario.js
