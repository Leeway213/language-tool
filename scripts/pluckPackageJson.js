
const fs = require('fs');

const packageJsonStr = fs.readFileSync(`${__dirname}/../package.json`, { encoding: 'utf-8' });

const json = JSON.parse(packageJsonStr);

delete json.devDependencies;
delete json.scripts;
if (json.dependencies) {
  for (const key in json.dependencies) {
    if (key.startsWith('@types')) {
      delete json.dependencies[key];
    }
  }
}
const result = JSON.stringify(json, null, 2);

fs.writeFileSync(`${__dirname}/../bin/package.json`, result, { encoding: 'utf-8' });
