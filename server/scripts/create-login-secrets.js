import crypto from 'node:crypto';
import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter the new account password (input is visible): ', password => {
  rl.close();
  if (!password || password.length < 12) {
    console.error('Use a password with at least 12 characters.');
    process.exit(1);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  console.log('ADMIN_PASSWORD_HASH=' + salt + ':' + hash);
  console.log('AUTH_SECRET=' + crypto.randomBytes(48).toString('base64url'));
});
