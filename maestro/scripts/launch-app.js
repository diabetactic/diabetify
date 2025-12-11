// Launch Diabetactic app via adb - GraalJS compatible
var exec = Java.type('java.lang.Runtime')
  .getRuntime()
  .exec('adb shell am start -n io.diabetactic.app/io.diabetactic.app.MainActivity');
exec.waitFor();
output.result = 'App launched via adb';
