#!/bin/sh
cd $1
npm install
expo install react-native-safe-area-context@3.2.0
expo login -u $2 -p $3 --non-interactive
expo publish --quiet --send-to $4 --release-channel $5 --non-interactive