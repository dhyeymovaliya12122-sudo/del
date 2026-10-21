const { execSync } = require('child_process');

for (const pkg of ['braces', 'sprintf-js', 'multer', 'file-type', '@nestjs/core']) {
  try {
    const versions = JSON.parse(execSync(`npm view ${pkg} versions --json`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      env: { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` }
    }));
    console.log(pkg, 'last 10 versions:', versions.slice(-10));
  } catch (e) {
    console.error(pkg, e.message);
  }
}
