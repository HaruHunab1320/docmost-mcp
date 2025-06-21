#!/usr/bin/env node

const bcrypt = require('bcrypt');

const password = process.argv[2] || 'testpassword123';
const saltRounds = 12;

bcrypt.hash(password, saltRounds).then(hash => {
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
}).catch(err => {
    console.error('Error generating hash:', err);
});