# Easy Scaff-d (이지 스캐폴드)

시스템 비계 2D 도면 작성 및 수량 산출 모바일 웹 애플리케이션

## 🏗️ 프로젝트 소개

Easy Scaff-d는 건설 현장에서 시스템 비계 설치 도면을 신속하고 정확하게 작성할 수 있는 모바일 최적화 웹 애플리케이션입니다. 복잡한 CAD 프로그램 없이도 현장에서 즉시 도면을 그리고 필요한 자재 수량을 확인할 수 있습니다.

### 주요 특징
- 📱 **모바일 최적화**: 스마트폰, 태블릿에서 완벽하게 작동
- 🎯 **표준 규격 자동 적용**: 시스템 비계 표준 규격(293mm~1817mm) 자동 맞춤
- ✏️ **직관적인 터치 드로잉**: 손가락으로 쉽게 도면 작성
- 📊 **실시간 수량 산출**: 자재별 수량 자동 계산 (개발 중)
- 💾 **프로젝트 관리**: 현장별 도면 저장 및 관리 (개발 중)

## 🚀 시작하기

### 온라인으로 바로 사용
https://scaffolding-draw-app.vercel.app

### 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/petra888/scaffolding-draw-app.git
cd scaffolding-draw-app

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

개발 서버는 http://localhost:3005 에서 실행됩니다.

## 📱 사용 방법

### 기본 조작
- **그리기**: 펜(✏️) 도구 선택 후 터치/드래그
- **시스템비계 모드**: 🏗️ 도구로 사각형 구조 자동 생성
- **삭제**: 🗑️ 도구로 선 삭제
- **화면 이동**: 👆 도구로 캔버스 이동

### 제스처
- **핀치 줌**: 두 손가락으로 확대/축소
- **팬**: 선택 도구에서 화면 드래그로 이동

### 고급 기능
- **직선 모드** (📏): 정확한 직선 그리기
- **직각 모드** (📐): 수직/수평선만 그리기
- **자석 기능** (🧲): 선 끝점 자동 연결
- **전체 보기** (🖼️): 모든 도면을 화면에 맞춤

## 🛠️ 기술 스택

- **Frontend**: React 18, TypeScript
- **Canvas**: HTML5 Canvas API
- **Styling**: CSS3, 반응형 디자인
- **Deployment**: Vercel
- **Package Manager**: npm

## 📂 프로젝트 구조

```
scaffolding_draw_app/
├── src/
│   ├── components/
│   │   ├── DrawingCanvas.tsx    # 메인 캔버스 컴포넌트
│   │   ├── Toolbar.tsx          # 상단 도구 모음
│   │   └── ComponentPalette.tsx # 부품 팔레트
│   ├── App.tsx                  # 메인 앱 컴포넌트
│   └── index.tsx                # 진입점
├── public/                      # 정적 파일
└── package.json                 # 프로젝트 설정
```

## 🔧 개발 현황

### ✅ 완료된 기능
- 터치 기반 드로잉
- 시스템비계 표준 규격 자동 적용
- 핀치 줌 & 팬
- 모바일 반응형 UI
- 도구 툴 크기 조절
- 전체 보기 기능

### 🚧 개발 중
- 실시간 수량 산출 패널
- 프로젝트 저장/불러오기
- 이미지/PDF 내보내기
- 부품 라이브러리 활용

### 📋 예정된 기능
- 객체 선택 및 편집
- 복사/붙여넣기
- 실행 취소/다시 실행
- 클라우드 동기화
- 오프라인 지원

## 🤝 기여하기

프로젝트 개선에 기여하고 싶으시다면:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 📞 문의

프로젝트 관련 문의사항이 있으시면 Issues 탭을 이용해주세요.

---

Made with ❤️ for construction site managers 