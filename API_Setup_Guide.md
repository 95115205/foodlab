# 흙에살다 (Living in Soil) 기술 가이드라인

본 문서는 사내 개발팀이 이번에 고도화된 'O-L-S 식재료 품질 분석 시스템'을 유지보수하고 추가 개발하기 위한 가이드입니다.

## 1. 프로젝트 개요
- **목적**: 기존의 정적인 수작업 위주의 DB 애플리케이션을 PWA, 컴포넌트화, 난독화가 적용된 전문적인 플랫폼으로 재설계.
- **핵심 UI/UX**: 12-column Grid를 활용한 "Bento-Grid" 모듈형 적용으로 가독성을 극대화, Base Font Size를 17px로 고정.

## 2. 백엔드 (Ruby on Rails)
공공 API 데이터를 크론잡 주기적으로 패치해 저장하는 아키텍처입니다.

### 2.1 주요 파일 구성
- `app/models/ingredient.rb`: 식재료 정보를 관리하고 JSONB 필드를 활용하여 기관별(MFDS, USDA, MHLW) 규격 비교를 저장합니다.
- `app/services/open_api_service.rb`: 공공 API 통신 시뮬레이션 및 데이터 정규화를 수행하는 파이프라인.

### 2.2 API 명세 (추후 컨트롤러 마운트 시)
- `GET /api/v1/ingredients` : 등록된 모든 식재료 목록 조회 (페이지네이션).
- `GET /api/v1/ingredients/:id/sync` : 해당 식재료의 공공 API 데이터를 강제로 Sync하여 최신화.

## 3. 프론트엔드 (PWA & 난독화)
순수 HTML/CSS/JS 기반으로 빌드 없이도 작동하나, 프로덕션 배포 시 보안을 위해 난독화 과정을 거칩니다.

### 3.1 PWA (Progressive Web App)
- `manifest.json`: 모바일, 데스크톱에서의 네이티브 앱 아이콘 구동 및 테마 컬러 설정.
- `sw.js`: Service Worker. 네트워크 오프라인 시에도 이전에 캐시된 API/Asset(`dist/app.bundle.js`)을 즉시 서빙합니다.

### 3.2 Webpack Obfuscation
핵심 파싱 로직 및 UI 로직이 외부에 유출되지 않도록 `webpack-obfuscator`를 파이프라인에 포함시켰습니다.
- **빌드 명령어**: `npm run build`
- **결과물**: `frontend/dist/app.bundle.js`에 난독화 및 최소화(Minified)된 상태로 산출되며, `index.html`은 이를 참조합니다.

## 4. 로컬 환경 실행 가이드
1. `npm install` 로 의존성 설치 (프론트엔드).
2. `npm run build` 스크립트를 통해 난독화 빌드 산출물 생성.
3. 로컬 서버(예: `npx serve .` 혹은 VSCode Live Server)를 통해 `frontend/index.html` 구동.
4. 개발자 도구의 'Application' 탭에서 Service Worker가 정상 등록되었고, `dist/app.bundle.js`가 캐싱되었는지 확인.
