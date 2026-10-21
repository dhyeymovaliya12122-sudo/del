const { execSync } = require('child_process');
const pkgs = [
  '@nestjs/core',
  '@nestjs/common',
  'ajv',
  'body-parser',
  'braces',
  'file-type',
  'glob',
  'lodash',
  'minimatch',
  'multer',
  'picomatch',
  'qs',
  'sprintf-js',
  'tmp',
  'uuid',
  'webpack',
  '@nestjs-modules/ioredis'
];

for (const p of pkgs) {
  try {
    const out = execSync(`npm view ${p} dist-tags --json`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      env: { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` }
    });
    console.log(p, '=>', out.trim().replace(/\s+/g, ' '));
  } catch (e) {
    console.error(p, 'ERROR:', e.message);
  }
}
