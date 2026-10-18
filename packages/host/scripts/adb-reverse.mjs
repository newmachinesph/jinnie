import {execFileSync} from 'node:child_process';

/*
 * An Android emulator cannot reach the host machine on `localhost`. The RN CLI
 * only reverses the Metro port (8081); every mini-app dev server needs the same
 * treatment or the host boots and then fails to resolve a single remote.
 *
 * Run once per emulator boot: pnpm --filter @jinnie/host reverse
 */

const PORTS = [8081, 9020, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010, 9011, 9012, 9013, 9014, 9015];

const failures = [];
for (const port of PORTS) {
  try {
    execFileSync('adb', ['reverse', `tcp:${port}`, `tcp:${port}`], {stdio: 'pipe'});
    console.log(`reversed tcp:${port}`);
  } catch (error) {
    failures.push(port);
  }
}

if (failures.length > 0) {
  console.error(
    `\nCould not reverse: ${failures.join(', ')}.\n` +
      'Check that adb is on PATH and exactly one device or emulator is attached ' +
      '(`adb devices`).',
  );
  process.exit(1);
}
