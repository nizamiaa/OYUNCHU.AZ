import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-hash.js <password>');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
})();
