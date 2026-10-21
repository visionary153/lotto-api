# lotto-api

로또 6/45 **역대 추첨결과**와 **1등 당첨 판매점** 정보를 정적 JSON으로 제공하는 API입니다.


- 비공식 데이터입니다. 당첨 확인이나 지급 같은 중요한 판단은 반드시 [동행복권](https://www.dhlottery.co.kr) 공식 결과로 확인하세요.

## 빠른 시작

```sh
curl https://choi-chulwoong.github.io/lotto-api/results/latest.json
```

## 엔드포인트

Base URL: `https://choi-chulwoong.github.io/lotto-api`

| 경로 | 내용 |
|---|---|
| `/results/latest.json` | 최신 회차 추첨결과 1건 |
| `/results/{회차}.json` | 해당 회차 추첨결과 |
| `/results/all.json` | 1회부터 최신 회차까지 전체 추첨결과 배열 |
| `/stores/{회차}.json` | 해당 회차 1등 당첨 판매점 (**262회부터** 제공) |


## 추첨결과 `results/{회차}.json`

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

| 필드 | 타입 | 설명 |
|---|---|---|
| `round` | number | 회차 |
| `date` | string | 추첨일 (`YYYY-MM-DD`) |
| `numbers` | number[6] | 당첨번호 6개 (오름차순) |
| `bonus` | number | 보너스 번호 |
| `ranks` | object[5] | 1~5등 당첨 정보 |
| `ranks[].rank` | number | 등수  |
| `ranks[].prize` | number | **1게임당** 당첨금 |
| `ranks[].winners` | number | 당첨 게임 수 |
| `firstPrizeMethods` | object \| null | 1등 당첨 게임의 번호 선택 방식별 개수 (`auto` 자동 / `manual` 수동 / `semiAuto` 반자동). 원본에 기록이 없는 **1~261회는 `null`** |
| `totalSales` | number | 해당 회차 총 판매금액 |

## 1등 판매점 `stores/{회차}.json`

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

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 판매점 ID |
| `name` | string | 상호명 |
| `address` | string | 주소 |
| `region` | string | 지역 (예: `서울`, `부산`) |
| `method` | string | 1등 번호 선택 방식: `자동` / `수동` / `반자동` |
| `lat` | number \| `""` | 위도 |
| `lng` | number \| `""` | 경도 |

- 현재 **정상 영업 중인 판매점만** 포함합니다.

## 주의사항

- 이 데이터는 동행복권 공개 정보를 수집해 가공한 것입니다. 동행복권과 무관한 **비공식** 서비스이며, 오류나 지연이 있을 수 있습니다.
- 데이터의 정확성이나 계속 제공되는 것을 보장하지 않습니다. 이 데이터를 사용해서 생긴 결과에 대해 책임지지 않습니다.
- 데이터 출처, 수집 방식, 권리자 삭제·중단 요청 방법은 [이용 정책](https://choi-chulwoong.github.io/lotto-api/policy.html)을 확인하세요. 요청은 [Issues](https://github.com/choi-chulwoong/lotto-api/issues)로 받습니다.

