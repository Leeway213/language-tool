#!/usr/bin/env node

import commander from 'commander';

const p = require(`${__dirname}/package.json`);


commander.version(p.version)
  .usage('<command>')
  .command('pluck', 'pluck sentences')
  .command('split', 'split text file, support excel')
  .command('merge', 'merge excel files in a directory')
  .command('sentences', '拆分句子并翻译')
  .command('translate', '翻译句子')
  .command('ocr', '通过ocr识别文件')
  .command('gcp', '设置gcp keystore')
  .command('textgridfill', '填充textgrid')
  .parse(process.argv);
