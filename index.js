require('dotenv').config();
const config = require('./config.json');
const fs = require('fs');
const Program = require('./modules/Program');

// console.log('Load env file data: ' + JSON.stringify(process.env, null, 2));
console.log('Load config file data: ' + JSON.stringify(config, null, 2));

const program = new Program();
program.process();
