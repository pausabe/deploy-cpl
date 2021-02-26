#!/bin/sh
cp cpl-app/src/Assets/db/cpl-app.db /opt/usb/$(date +%m-%d-%y)_cpl-app.db
cd cpl-app
git pull
npm install
expo install react-native-safe-area-context
expo login -u $1 -p $2 --non-interactive
expo publish --quiet --send-to $3 --release-channel $4 --non-interactive