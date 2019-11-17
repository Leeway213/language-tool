const puppeteer = require('puppeteer');
const fs = require('fs');

puppeteer.launch({
  headless: false,
  timeout: 0,
  args: [
    '--remote-debugging-port=54281'
  ]
}).then(browser => {
  browser.process().on('message', message => {
    fs.writeFileSync('./test.txt', message, { encoding: 'utf-8' });
    console.log(message);
  });
  process.send(browser.wsEndpoint());
});

