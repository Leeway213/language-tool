#!/usr/bin/env node

import commander from 'commander';

const p = require(`${__dirname}/package.json`);


commander.version(p.version)
  .usage('<command>')
  .command('pluck', 'pluck sentences')
  .command('split', 'split text file, support excel')
  .command('merge', 'merge excel files in a directory')
  .command('sentences', '拆分句子并翻译')
  .parse(process.argv);
