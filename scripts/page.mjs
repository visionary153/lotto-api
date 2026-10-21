// index.html의 최신 회차 영역과 sitemap.xml의 lastmod를 results/latest.json 기준으로 갱신한다.
// 검색엔진이 JS 없이도 최신 당첨번호를 읽을 수 있도록 HTML에 직접 써넣는다.
//
//   node scripts/page.mjs   # 네트워크 요청 없음

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(ROOT, 'index.html');
const SITEMAP = join(ROOT, 'sitemap.xml');
const START = '<!-- latest:start -->';
const END = '<!-- latest:end -->';

const won = (n) => `${n.toLocaleString('ko-KR')}원`;
const ballClass = (n) => `ball b${Math.min(Math.ceil(n / 10), 5)}`;
const ball = (n) => `<li class="${ballClass(n)}">${n}</li>`;

function renderLatest(d) {
  const first = d.ranks[0];
  const firstText = first.winners > 0 ? `${won(first.prize)} (${first.winners}게임)` : '당첨자 없음';
  const numbersText = `${d.numbers.join(', ')} + 보너스 ${d.bonus}`;
  return `${START}
  <section id="latest" class="latest" aria-label="로또 ${d.round}회 당첨번호">
    <div class="latest-inner">
      <p class="latest-title"><strong>로또 ${d.round}회 당첨번호</strong> <span class="latest-date">${d.date} 추첨</span></p>
      <ul class="balls" aria-label="${numbersText}">
        ${d.numbers.map(ball).join('\n        ')}
        <li class="plus" aria-hidden="true">+</li>
        ${ball(d.bonus)}
      </ul>
      <p class="latest-prize">1등 <strong>${firstText}</strong></p>
      <a class="latest-link" href="results/latest.json">latest.json</a>
    </div>
  </section>
  ${END}`;
}

/** 내용이 바뀐 파일 경로 목록을 돌려준다 */
export async function updatePage(latest) {
  const changed = [];

  const html = await readFile(INDEX, 'utf8');
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s < 0 || e < 0) throw new Error('index.html에 latest 마커가 없음');
  const nextHtml = html.slice(0, s) + renderLatest(latest) + html.slice(e + END.length);
  if (nextHtml !== html) {
    await writeFile(INDEX, nextHtml);
    changed.push('index.html');
  }

  const sitemap = await readFile(SITEMAP, 'utf8');
  const nextSitemap = sitemap.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${latest.date}</lastmod>`);
  if (nextSitemap !== sitemap) {
    await writeFile(SITEMAP, nextSitemap);
    changed.push('sitemap.xml');
  }

  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const latest = JSON.parse(await readFile(join(ROOT, 'results', 'latest.json'), 'utf8'));
  console.log(`변경: ${(await updatePage(latest)).join(', ') || '없음'}`);
}
