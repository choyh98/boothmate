# ILV 전시 부스 매칭 사이트

정적 HTML/CSS/JS 기반으로 만든 ILV 전시 부스 매칭 웹사이트입니다. Vercel 배포와 Supabase 인증/저장 연동을 준비해둔 구조입니다.

## 실행

```bash
npm run dev
```

로컬 주소:

```text
http://127.0.0.1:53129/
```

## 빌드

```bash
npm run build
npm run check
```

빌드 결과는 `dist/` 폴더에 생성됩니다. Vercel은 `vercel.json` 설정에 따라 `npm run build` 후 `dist`를 배포합니다.

## Supabase 설정

Supabase 프로젝트에서 `supabase/schema.sql`을 실행한 뒤, Vercel 환경변수에 아래 값을 추가합니다.

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

값이 없으면 사이트는 데모 모드로 동작하고, 값이 있으면 로그인/회원가입/견적 요청 저장을 Supabase로 시도합니다.

## 주요 페이지

- `index.html`: 메인 페이지
- `schedule.html`: 전시 일정
- `event-detail.html`: 전시 상세
- `quote.html`: 견적 요청 플로우
- `login.html`: 로그인
- `signup.html`: 회원가입
