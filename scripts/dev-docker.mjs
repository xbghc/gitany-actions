// Quick check to confirm Docker can run containers on this machine.
import { execSync } from 'node:child_process';

try {
  const output = execSync('docker run --rm hello-world', {
    encoding: 'utf8',
  });
  console.log(output);
} catch (err) {
  const msg = err.stderr?.toString().trim() || err.message;
  console.error('Docker container failed to start:', msg);
  process.exit(1);
}
