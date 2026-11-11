// Pages 배포 직후 네이버·Bing에 문서 페이지가 바뀌었다고 알린다 (IndexNow). Google은 IndexNow를 쓰지 않는다.
// 데이터가 갱신되면 index.html의 최신 회차 영역이 바뀌므로 문서 첫 페이지를 알린다. JSON 파일은 색인 대상이 아니라 보내지 않는다.
// 키 파일이 /lotto-api/ 아래에 있으므로 이 경로 아래 주소만 알릴 수 있다 (IndexNow 규약).
// 실패해도 배포는 이미 끝났으므로 경고만 남긴다.
//
//   node scripts/indexnow.mjs            → 전송
//   node scripts/indexnow.mjs --dry-run  → 보낼 내용만 출력

import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://visionary153.github.io/lotto-api';
const ENDPOINTS = ['https://searchadvisor.naver.com/indexnow', 'https://www.bing.com/indexnow'];
const KEY_FILE = /^([0-9a-f]{32})\.txt$/;

async function findKey() {
  const key = (await readdir(ROOT)).map((f) => KEY_FILE.exec(f)?.[1]).find(Boolean);
  if (!key) throw new Error('저장소 루트에 IndexNow 키 파일(<키>.txt)이 없어요');
  return key;
}

async function main() {
  const key = await findKey();
  const body = {
    host: new URL(SITE).host,
    key,
    keyLocation: `${SITE}/${key}.txt`,
    urlList: [`${SITE}/`],
  };

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      // 200(반영)·202(키 확인 대기)가 정상
      const log = res.ok ? console.log : console.warn;
      log(`${endpoint} → ${res.status} ${res.ok ? '' : await res.text()}`.trim());
    } catch (error) {
      console.warn(`${endpoint} → 전송 실패: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.warn(`IndexNow 알림을 건너뜀: ${error.message}`);
});
