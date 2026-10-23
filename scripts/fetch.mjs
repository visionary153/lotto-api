// 동행복권에서 로또 6/45 추첨결과와 1등 판매점을 가져와 JSON으로 저장한다.
//
//   node scripts/fetch.mjs              # 저장된 마지막 회차 이후 ~ 최신 회차 (증분)
//   node scripts/fetch.mjs --from 1     # 지정 회차부터 다시 수집 (전체 백필)
//   node scripts/fetch.mjs --from 444 --to 593 --stores-only   # 지정 범위의 판매점만 다시 수집
//
// 출력
//   results/{회차}.json   추첨결과
//   results/all.json      전체 추첨결과 (회차 ASC)
//   results/latest.json   최신 회차
//   stores/{회차}.json    1등 판매점 (262회부터 제공)
//   index.html, sitemap.xml  최신 회차 반영 (scripts/page.mjs)

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { updatePage } from './page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = join(ROOT, 'results');
const STORES_DIR = join(ROOT, 'stores');

const BASE = 'https://www.dhlottery.co.kr';
const DRAW_URL = `${BASE}/lt645/selectPstLt645Info.do`;
const STORE_URL = `${BASE}/wnprchsplcsrch/selectLtWnShp.do`;
const STORE_PAGE_SIZE = 50;
// 동행복권은 262회부터 1등 판매점 정보를 제공한다.
const FIRST_STORE_ROUND = 262;
const CONCURRENCY = 1;
// 요청 간 간격 (짧은 시간에 많이 요청하면 동행복권이 IP를 일시 차단한다)
const REQUEST_DELAY_MS = 1000;

async function getJson(url, params, attempt = 1) {
  const qs = new URLSearchParams(params).toString();
  await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  try {
    const res = await fetch(qs ? `${url}?${qs}` : url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt >= 6) throw new Error(`${url}?${qs} 실패: ${e.message}`);
    await new Promise((r) => setTimeout(r, 1000 * Math.min(2 ** attempt, 16)));
    return getJson(url, params, attempt + 1);
  }
}

/** 회차를 생략하면 최신 회차 */
async function fetchRawDraw(round) {
  const json = await getJson(DRAW_URL, round ? { srchLtEpsd: round } : {});
  const raw = json?.data?.list?.[0];
  if (!raw) throw new Error(`${round ?? '최신'}회 추첨결과 없음`);
  if (round && raw.ltEpsd !== round) throw new Error(`${round}회 요청에 ${raw.ltEpsd}회 응답`);
  return raw;
}

function toDraw(r) {
  const numbers = [r.tm1WnNo, r.tm2WnNo, r.tm3WnNo, r.tm4WnNo, r.tm5WnNo, r.tm6WnNo];
  const ymd = String(r.ltRflYmd);
  return {
    round: r.ltEpsd,
    date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
    numbers,
    bonus: r.bnsWnNo,
    /** 1~5등 순서. prize: 1게임당 당첨금, winners: 당첨 게임 수 */
    ranks: [1, 2, 3, 4, 5].map((rank) => ({
      rank,
      prize: r[`rnk${rank}WnAmt`],
      winners: r[`rnk${rank}WnNope`],
    })),
    /** 1등 선택유형별 당첨 게임 수 (262회 이전은 미제공 → null) */
    firstPrizeMethods:
      r.ltEpsd >= FIRST_STORE_ROUND ? { auto: r.winType1, manual: r.winType2, semiAuto: r.winType3 } : null,
    totalSales: r.rlvtEpsdSumNtslAmt,
  };
}

/** 추첨 직후엔 당첨금·당첨자가 0으로 나올 수 있다. 그런 데이터는 저장하지 않고 다음 실행에서 재시도한다. */
function validateDraw(d) {
  const all = [...d.numbers, d.bonus];
  if (all.some((n) => !Number.isInteger(n) || n < 1 || n > 45) || new Set(all).size !== 7) {
    return '당첨번호 이상';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return '추첨일 이상';
  // 5등은 매회 수십만 명 이상 → 0이면 집계 전
  const fifth = d.ranks[4];
  if (!fifth.winners || !fifth.prize) return '당첨 집계 전';
  return null;
}

const str = (v) => (v == null ? '' : String(v).trim());

/** raw: 응답 원본 행 수 (집계 여부 판단용), stores: 정상 영업 판매점만 */
async function fetchStores(round) {
  const list = [];
  for (let page = 1; ; page++) {
    const json = await getJson(STORE_URL, {
      srchWnShpRnk: 1,
      srchLtEpsd: round,
      srchShpLctn: '',
      pageNum: page,
      recordCountPerPage: STORE_PAGE_SIZE,
    });
    const data = json?.data;
    if (!data) throw new Error(`${round}회 판매점 응답 이상`);
    list.push(...data.list);
    if (data.list.length < STORE_PAGE_SIZE || list.length >= data.total) break;
  }
  // 1등 당첨 1건당 1행 (같은 판매점이 여러 번 나올 수 있음)
  const stores = list
    .filter((s) => s.status === '정상')
    .map((s) => ({
      id: s.ltShpId ?? '',
      name: s.shpNm ?? '',
      address: str(s.befAddr),
      region: str(s.region),
      method: s.atmtPsvYnTxt ?? '',
      lat: s.shpLat ?? '',
      lng: s.shpLot ?? '',
    }));
  return { raw: list.length, stores };
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/** 내용이 바뀐 경우에만 쓴다 (불필요한 커밋 방지) */
async function writeJson(path, value, pretty = true) {
  const text = JSON.stringify(value, null, pretty ? 2 : undefined) + '\n';
  const prev = await readFile(path, 'utf8').catch(() => null);
  if (prev === text) return false;
  await writeFile(path, text);
  return true;
}

async function savedRounds(dir) {
  const files = await readdir(dir).catch(() => []);
  return files.map((f) => /^(\d+)\.json$/.exec(f)?.[1]).filter(Boolean).map(Number);
}

async function pool(items, worker) {
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) await worker(items[i++]);
    }),
  );
}

async function main() {
  await mkdir(RESULTS_DIR, { recursive: true });
  await mkdir(STORES_DIR, { recursive: true });

  const fromArg = process.argv.indexOf('--from');
  const from = fromArg > 0 ? Number(process.argv[fromArg + 1]) : null;
  const storesOnly = process.argv.includes('--stores-only');
  const toArg = process.argv.indexOf('--to');
  const to = toArg > 0 ? Number(process.argv[toArg + 1]) : null;

  const latestRaw = await fetchRawDraw();
  const latestRound = latestRaw.ltEpsd;
  const haveDraws = new Set(await savedRounds(RESULTS_DIR));
  const haveStores = new Set(await savedRounds(STORES_DIR));

  // 수집 대상: --from 이후 전부, 아니면 누락된 회차 + 최신 회차(집계 갱신 반영)
  const start = from ?? 1;
  const drawTargets = [];
  const storeTargets = [];
  const end = Math.min(to ?? latestRound, latestRound);
  for (let r = start; r <= end; r++) {
    if (!storesOnly && (from != null || !haveDraws.has(r) || r === latestRound)) drawTargets.push(r);
    if (r >= FIRST_STORE_ROUND && (from != null || !haveStores.has(r) || r === latestRound)) {
      storeTargets.push(r);
    }
  }
  console.log(`최신 ${latestRound}회 / 추첨결과 ${drawTargets.length}건, 판매점 ${storeTargets.length}건 수집`);

  const changed = [];
  const skipped = [];
  const draws = new Map();
  let excluded = 0;

  await pool(drawTargets, async (round) => {
    const draw = toDraw(round === latestRound ? latestRaw : await fetchRawDraw(round));
    const problem = validateDraw(draw);
    if (problem) {
      skipped.push(`${round}회 추첨결과: ${problem}`);
      return;
    }
    draws.set(round, draw);
    if (await writeJson(join(RESULTS_DIR, `${round}.json`), draw)) changed.push(`results/${round}.json`);
  });

  await pool(storeTargets, async (round) => {
    const draw = draws.get(round) ?? (await readJson(join(RESULTS_DIR, `${round}.json`)));
    // 추첨결과가 집계 전이면 판매점도 집계 전 → 요청하지 않는다 (토요일 잦은 확인 시 요청 절약)
    if (!draw) {
      skipped.push(`${round}회 판매점: 집계 전`);
      return;
    }
    const { raw, stores } = await fetchStores(round);
    // 1등 당첨자가 있는데 판매점 응답이 비어 있으면 아직 집계 전 (정상 필터 전 원본 기준)
    if (draw.ranks[0].winners > 0 && raw === 0) {
      skipped.push(`${round}회 판매점: 집계 전`);
      return;
    }
    excluded += raw - stores.length;
    if (await writeJson(join(STORES_DIR, `${round}.json`), { round, stores })) {
      changed.push(`stores/${round}.json`);
    }
  });

  // all.json / latest.json 재생성
  const all = [];
  for (const round of (await savedRounds(RESULTS_DIR)).sort((a, b) => a - b)) {
    all.push(draws.get(round) ?? (await readJson(join(RESULTS_DIR, `${round}.json`))));
  }
  for (let r = 1; r <= all.at(-1).round; r++) {
    if (all[r - 1]?.round !== r) throw new Error(`${r}회 누락 — all.json을 만들 수 없음`);
  }
  if (await writeJson(join(RESULTS_DIR, 'all.json'), all, false)) changed.push('results/all.json');
  if (await writeJson(join(RESULTS_DIR, 'latest.json'), all.at(-1))) changed.push('results/latest.json');
  changed.push(...(await updatePage(all.at(-1))));

  console.log(`판매점 정상 아닌 행 ${excluded}건 제외`);
  console.log(`변경 ${changed.length}건${changed.length <= 10 ? `: ${changed.join(', ')}` : ''}`);
  if (skipped.length) console.log(`보류 ${skipped.length}건:\n  ${skipped.sort().join('\n  ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
