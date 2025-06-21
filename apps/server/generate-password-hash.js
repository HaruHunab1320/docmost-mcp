const bcrypt = require('bcrypt');

const password = process.argv[2] || 'testpassword123';
const rounds = 10;

bcrypt.hash(password, rounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log(hash);
});