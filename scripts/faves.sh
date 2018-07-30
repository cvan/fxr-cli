#!/usr/env sh

function sleepAndScreencap () {
  sleep 3
  /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell screencap /sdcard/$(date +%F_%T).png
  sleep 1
  /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell screencap /sdcard/$(date +%F_%T).png
  sleep 1
  /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell screencap /sdcard/$(date +%F_%T).png
  sleep 1
  /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell screencap /sdcard/$(date +%F_%T).png
}

node index.js launch 'https://kuula.co/post/7PP6r'

sleepAndScreencap

node index.js launch 'https://roundme.com/tour/282771/view/879807/'

sleepAndScreencap

node index.js launch "https://my.panomoments.com/u/AaronPriest/m/bass-harbor-lighthouse"


#
# /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell setprop debug.oculus.enableVideoCapture 0
# /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell setprop debug.oculus.enableVideoCapture 1
# /opt/mozillareality/fxr-cli/node_modules/.bin/adbn shell screencap /sdcard/$(date +%F_%T).png
# /opt/mozillareality/fxr-cli/node_modules/.bin/adbn pull /sdcard/revoked.badssl.com.png
#
