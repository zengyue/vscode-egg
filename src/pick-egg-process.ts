'use strict';

import { exec } from 'child_process';

export function pickProcess() {
  return new Promise<string>((resolve, reject) => {
    exec('ps aux', function (err, stdout, stderr) {
      if (err) { return reject(err); }
      const workerProcess = stdout.split('\n').find(line => {
        return /egg-cluster\/lib\/app_worker.js/.test(line);
      });
      if (!workerProcess) { return reject('no worker process'); }
      // 这里获取到的process 信息为， 第二列为pid
      // yue  35239   0.0  0.5  3681988  42352 s004  S+  3:08PM   0:01.08 /Users/yue/.nvm/versions/node/v7.6.0/bin/node /Users/yue/Sites/test/egg-example/node_modules/.1.6.1@egg-cluster/lib/app_worker.js {"framework":"/Users/yue/Sites/test/egg-example/node_modules/egg","baseDir":"/Users/yue/Sites/test/egg-example","port":7001,"workers":1,"plugins":null,"https":false,"key":"","cert":"","clusterPort":60688}
      const pid = workerProcess.split(/\s+/)[1];
      resolve(pid);
    });
  });
}