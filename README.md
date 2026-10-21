# lotto-api

로또 6/45 **당첨번호**와 **1등 당첨 판매점**을 JSON으로 제공하는 무료 로또 API입니다.

📖 **API 문서: https://visionary153.github.io/lotto-api/**

> 비공식 데이터입니다. 당첨 확인이나 지급 같은 중요한 판단은 반드시 [동행복권](https://www.dhlottery.co.kr) 공식 결과로 확인하세요.

## 기본 정보

| 항목 | 값 |
|---|---|
| Base URL | `https://visionary153.github.io/lotto-api` |
| 응답 형식 | `application/json`, UTF-8 |
| 메서드 | `GET` |

## 빠른 시작

```sh
curl https://visionary153.github.io/lotto-api/results/latest.json
```

```js
const res = await fetch('https://visionary153.github.io/lotto-api/results/latest.json');
const draw = await res.json();
console.log(`${draw.round}회 (${draw.date}) 당첨번호: ${draw.numbers.join(', ')} + ${draw.bonus}`);
```

```python
import requests

draw = requests.get('https://visionary153.github.io/lotto-api/results/latest.json').json()
print(draw['round'], draw['numbers'], draw['bonus'])
```

## 추첨결과 조회

회차별 로또 당첨번호, 1등부터 5등까지의 게임당 당첨금과 당첨 수를 제공합니다.

| 메서드 | 경로 | 내용 |
|---|---|---|
| `GET` | [`/results/latest.json`](https://visionary153.github.io/lotto-api/results/latest.json) | 최신 회차 1건 |
| `GET` | `/results/{회차}.json` | 특정 회차 데이터 (예: [`/results/1190.json`](https://visionary153.github.io/lotto-api/results/1190.json)) |
| `GET` | [`/results/all.json`](https://visionary153.github.io/lotto-api/results/all.json) | 전체 회차 데이터 (회차 오름차순 배열) |

### 요청

| 경로 파라미터 | 타입 | 설명 |
|---|---|---|
| `회차` (필수) | number | `/results/{회차}.json`에서 조회할 회차 (1 ~ 최신 회차) |

### 응답

| 필드 | 타입 | 설명 |
|---|---|---|
| `round` | number | 회차 |
| `date` | string | 추첨일 (`YYYY-MM-DD`) |
| `numbers` | number[6] | 당첨번호 6개 (오름차순) |
| `bonus` | number | 보너스 번호 |
| `ranks` | object[5] | 1~5등 당첨 정보 |
| `ranks[].rank` | number | 등수 |
| `ranks[].prize` | number | **1게임당** 당첨금 (원) |
| `ranks[].winners` | number | 당첨 게임 수 |
| `firstPrizeMethods` | object \| null | 1등 당첨 게임의 번호 선택 방식별 개수 (`auto` 자동 / `manual` 수동 / `semiAuto` 반자동). 원본에 기록이 없는 **1~261회는 `null`** |
| `totalSales` | number | 해당 회차 총 판매금액 (원) |

### 예제

```sh
curl https://visionary153.github.io/lotto-api/results/1190.json
```

```json
{
  "round": 1190,
  "date": "2025-09-20",
  "numbers": [7, 9, 19, 23, 26, 45],
  "bonus": 33,
  "ranks": [
    { "rank": 1, "prize": 4622793813, "winners": 6 },
    { "rank": 2, "prize": 40909680, "winners": 113 },
    { "rank": 3, "prize": 1403825, "winners": 3293 },
    { "rank": 4, "prize": 50000, "winners": 168764 },
    { "rank": 5, "prize": 5000, "winners": 2752776 }
  ],
  "firstPrizeMethods": { "auto": 3, "manual": 3, "semiAuto": 0 },
  "totalSales": 59184430500
}
```

## 1등 판매점 조회

회차별 로또 1등 당첨 판매점(로또 명당)의 상호명, 주소, 지역, 번호 선택 방식, 위도·경도를 제공합니다.

| 메서드 | 경로 | 내용 |
|---|---|---|
| `GET` | `/stores/{회차}.json` | 해당 회차 1등 당첨 판매점 (예: [`/stores/1190.json`](https://visionary153.github.io/lotto-api/stores/1190.json)) |

### 요청

| 경로 파라미터 | 타입 | 설명 |
|---|---|---|
| `회차` (필수) | number | 조회할 회차 (**262회부터** 제공) |

### 응답

| 필드 | 타입 | 설명 |
|---|---|---|
| `round` | number | 회차 |
| `stores` | object[] | 1등 당첨 판매점 목록 |
| `stores[].id` | string | 판매점 ID |
| `stores[].name` | string | 상호명 |
| `stores[].address` | string | 주소 |
| `stores[].region` | string | 지역 (예: `서울`, `부산`) |
| `stores[].method` | string | 1등 번호 선택 방식: `자동` / `수동` / `반자동` |
| `stores[].lat` | number \| `""` | 위도 |
| `stores[].lng` | number \| `""` | 경도 |

> [!NOTE]
> - 한 판매점에서 1등이 여러 게임 나오면 같은 판매점이 여러 번 들어갑니다.
> - 현재 **정상 영업 중인 판매점만** 포함합니다.

### 예제

```sh
curl https://visionary153.github.io/lotto-api/stores/1190.json
```

```json
{
  "round": 1190,
  "stores": [
    {
      "id": "12600086",
      "name": "돈벼락맞는곳",
      "address": "부산 동구 조방로49번길 18-1",
      "region": "부산",
      "method": "자동",
      "lat": 35.139161,
      "lng": 129.05993
    }
  ]
}
```

## 갱신 주기

- 매주 **토요일 20:50 / 21:30 / 22:30 (KST)**에 최신 회차 로또 당첨번호를 확인하고, **일·월요일 09:00**에 한 번 더 확인합니다.
- 추첨 직후 공식 집계가 끝나지 않은 데이터는 반영하지 않고 다음 확인 때 반영합니다.
- 1등 판매점은 집계가 늦어 일요일에 반영될 수 있습니다.
- 캐시 때문에 갱신 후 최대 10분 정도 이전 데이터가 보일 수 있습니다.

## 주의사항

- 이 데이터는 동행복권 공개 정보를 수집해 가공한 것입니다. 동행복권과 무관한 **비공식** 서비스이며, 오류나 지연이 있을 수 있습니다.
- 당첨 확인이나 지급 같은 중요한 판단은 반드시 [동행복권](https://www.dhlottery.co.kr) 공식 결과로 확인하세요.
- 데이터의 정확성이나 계속 제공되는 것을 보장하지 않습니다. 이 데이터를 사용해서 생긴 결과에 대해 책임지지 않습니다.
- 데이터 출처, 수집 방식, 권리자 삭제·중단 요청 방법은 [이용 정책](https://visionary153.github.io/lotto-api/policy.html)을 확인하세요. 요청은 [Issues](https://github.com/visionary153/lotto-api/issues)로 받습니다.
