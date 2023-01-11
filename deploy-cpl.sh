#!/bin/sh
cd $1
npx expo login -u $2 -p $3 --non-interactive
eas update --channel $5 --message "Update from deploy website"