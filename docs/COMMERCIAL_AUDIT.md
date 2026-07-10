# 상용 운영 감사

2026-07-10 기준 아니근데 서비스 감사 기록입니다. 단순히 화면이 보이는지보다 데이터 정합성, 모바일 입력, 위치 오차, 운영 가능성을 기준으로 정리합니다.

## P0: 출시 전 반드시 해결

| 영역 | 현재 위험 | 조치 기준 |
| --- | --- | --- |
| 위치 | 데스크톱 브라우저의 OS 위치가 `TIMEOUT`이면 최대 20초 동안 요청이 붙잡히고, IP 위치 fallback이 배포 환경 헤더에 의존합니다. | fallback을 즉시 시작하고, fallback 성공 시 화면을 사용할 수 있어야 합니다. 실제 GPS가 늦게 오면 더 정확한 위치로 교체합니다. |
| 반경 | 현재 위치는 coarse geohash 후보 셀만으로 조회되어 50m 반경에서도 셀 경계 바깥 생각이 섞일 수 있습니다. | 저장 위치를 원본 좌표가 아닌 더 촘촘한 grid bucket으로 유지하고, 표시 원과 같은 단계의 bucket 집합을 사용합니다. |
| 반응 | 중복 확인 후 삽입하고 heat를 별도 read-modify-write 해서 동시에 누르면 중복 오류 또는 heat 누락이 생길 수 있습니다. | DB unique index를 최종 방어선으로 사용하고, 중복 삽입은 성공적인 멱등 응답으로 처리합니다. heat 증가는 원자적 SQL 연산이어야 합니다. |
| 댓글 | 만료된 생각의 댓글을 조회할 수 있고, 댓글 생성과 만료 삭제의 경계가 일치하지 않습니다. | 조회·작성 모두 `status=live`와 `expires_at > now()`를 검사합니다. 생각 삭제 시 댓글도 cascade로 삭제합니다. |
| 만료 | Edge Function은 구현되어 있지만 Vercel Cron의 `CRON_SECRET` 설정과 원격 배포 상태를 별도로 확인해야 합니다. | Cron route 401/200 smoke와 Edge Function 삭제 smoke를 배포 후 확인합니다. |

## P1: 상용 품질을 위해 보강

| 영역 | 현재 상태 | 필요한 보강 |
| --- | --- | --- |
| 모바일 UI | `visualViewport`를 사용하지만 키보드가 열린 상태에서 지도, composer, bottom sheet가 서로 다른 viewport 기준을 사용할 여지가 있습니다. | 시트의 위치·높이·스크롤을 visual viewport 한 기준으로 계산하고, 입력 focus 회귀 테스트를 유지합니다. |
| 지도 제스처 | MapGlot이 반환하는 MapLibre 객체와 앱의 fallback 포인터 이벤트가 한 컨테이너에 공존합니다. | SDK가 준비되면 fallback 이벤트를 비활성화하고, 지도 canvas는 `touch-action`과 overscroll을 독점하도록 합니다. 카메라 이벤트는 zoom/pan을 디바운스합니다. |
| 실시간 추적 | GPS 콜백과 서버 nearby refresh의 주기가 다릅니다. | 지도 중심은 매 GPS 콜백에 반영하고, 서버 조회만 이동 거리·시간 기준으로 제한합니다. 손으로 pan하면 tracking을 풀고 현재 위치 버튼으로 복귀합니다. |
| 글로벌 | MapGlot 지도 라벨은 현재 한국어 고정이고, 생각 본문 번역 저장/캐시 계층은 없습니다. | `ko`/`en` locale을 요청 계약에 넣고, 원문과 번역을 별도 보관합니다. 번역 provider 키가 없을 때는 원문을 안전하게 표시합니다. |
| 신고 | 신고/관리자 기능은 있으나 운영자가 처리할 SLA, 감사 로그, rate limit, 자동 숨김 기준을 정해야 합니다. | 처리 이력, 신고자 중복 방지, 보류/숨김/삭제 상태, 관리자 토큰 회전과 알림을 운영 정책으로 고정합니다. |
| 관측성 | 화면 상태와 위치 진단 패널은 있지만 서버 correlation id와 핵심 지표가 없습니다. | request id, Edge Function latency/error, location source, map provider failure를 구조화해 수집합니다. |

## P2: 성장 단계

- 번역 provider를 비동기 job으로 분리하고 locale별 캐시 hit rate를 측정합니다.
- nearby 조회를 reaction 전체 row scan에서 집계 테이블 또는 SQL aggregate RPC로 전환합니다.
- 지역/국가별 abuse 방어, IP/device fingerprint 보존 기간, 개인정보 처리방침과 삭제 요청 흐름을 문서화합니다.
- MapGlot 호출량, Supabase Edge Function cold start, DB connection/pool, Cron 실패를 알림으로 연결합니다.
- Web Vitals, JS error, 지도 타일 오류, 모바일 키보드 입력 실패를 실제 운영 대시보드에서 추적합니다.

## 글로벌 언어 정책

- 한국어 브라우저와 한국 국가는 기본 UI와 번역 목표 언어를 `ko`로 사용합니다.
- 그 외 국가는 기본 UI와 번역 목표 언어를 `en`으로 사용합니다.
- 사용자가 작성한 태그는 검색성과 정체성을 위해 원문을 보존합니다.
- 본문은 원문을 보존하고, 번역이 준비되면 목표 언어 본문을 우선 표시하며 원문 보기 전환을 제공합니다.
- 번역 API 장애나 키 미설정은 게시 실패가 아니라 원문 fallback으로 처리합니다.

## 배포 완료 조건

1. `npm run lint`, `npm run harness:test`, `npm run build`, `npm run e2e` 통과
2. Supabase migration list와 security/performance advisor 확인
3. Edge Function 원격 배포 후 tags/create/comment/reaction/expire smoke 통과
4. Vercel Production에서 `/api/location-fallback`이 `source=vercel-ip` 좌표를 반환하는지 확인
5. Production `CRON_SECRET`과 Supabase secret이 서로 일치하는지 확인
6. 실제 iOS/Android/Chrome desktop에서 위치 fallback, pinch zoom, 키보드 focus, 반응 멱등성을 수동 확인
