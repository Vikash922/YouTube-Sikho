const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const BUILD_ID = '239c5ece-b7f9-4a40-8aee-fb3de7742a5e';
const EXPO_TOKEN = process.env.EXPO_TOKEN;

function queryBuild() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      query: `query ViewBuild($buildId: ID!) {
        builds {
          byId(buildId: $buildId) {
            id
            status
            priority
            enqueuedAt
            provisioningStartedAt
            workerStartedAt
            completedAt
            artifacts {
              buildUrl
            }
            error {
              message
              errorCode
            }
          }
        }
      }`,
      variables: { buildId: BUILD_ID }
    });

    const req = https.request('https://api.expo.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_TOKEN}`
      },
      timeout: 15000
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(buf);
          resolve(parsed?.data?.builds?.byId || null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

function downloadFile(url, destPath) {
  console.log(`[EAS] Downloading APK from ${url} to ${destPath}...`);
  try {
    execSync(`curl -fL -o "${destPath}" "${url}"`, { stdio: 'inherit' });
    const stats = fs.statSync(destPath);
    console.log(`[EAS] Successfully saved: ${destPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (err) {
    console.error(`[EAS] Error saving to ${destPath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`[EAS] Continuous Watcher active for Build ID: ${BUILD_ID}`);
  let lastStatus = '';
  const maxChecks = 180; // 180 * 20s = 60 minutes
  
  for (let i = 0; i < maxChecks; i++) {
    const build = await queryBuild();
    if (build) {
      if (build.status !== lastStatus) {
        console.log(`\n[EAS] Status updated -> ${build.status} | Worker: ${build.workerStartedAt || 'waiting'} | Time: ${new Date().toLocaleTimeString()}`);
        lastStatus = build.status;
      } else {
        process.stdout.write('.');
      }

      if (build.status === 'FINISHED') {
        console.log('\n[EAS] =====================================');
        console.log('[EAS] BUILD COMPLETED SUCCESSFULLY!');
        const apkUrl = build.artifacts?.buildUrl;
        console.log(`[EAS] Direct APK Download URL: ${apkUrl}`);
        console.log('[EAS] =====================================');
        
        if (apkUrl) {
          // 1. Phone storage
          downloadFile(apkUrl, '/sdcard/Download/YouTube-Sikho.apk');
          // 2. Local workspace
          downloadFile(apkUrl, '/root/course-app/YouTube-Sikho.apk');
        }
        process.exit(0);
      }

      if (build.status === 'ERRORED' || build.status === 'CANCELED') {
        console.error(`\n[EAS] Build failed with status: ${build.status}`);
        console.error('[EAS] Details:', JSON.stringify(build.error, null, 2));
        process.exit(1);
      }
    } else {
      process.stdout.write('?');
    }

    await new Promise(r => setTimeout(r, 20000));
  }

  console.log('\n[EAS] Poller reached maximum duration.');
}

main();
