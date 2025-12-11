// Launch app via adb shell - GraalJS compatible
var processBuilder = new java.lang.ProcessBuilder([
  'adb',
  'shell',
  'am',
  'start',
  '-n',
  'io.diabetactic.app/io.diabetactic.app.MainActivity',
]);
var process = processBuilder.start();
process.waitFor();
output.result = 'App launched via adb';
