/**
 * 흙에살다 Frontend App Logic
 * 完全 Serverless & Zero-Cost Architecture (PWA Static App)
 */

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    initApp();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker 등록 성공:', reg.scope))
                .catch(err => console.log('Service Worker 불가:', err));
        });
    }
}

function initApp() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) { fetchIngredientData(query); }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { searchBtn.click(); }
    });
}

// 사용자 입력 검색어와 내부 JSON 키(영문)를 매핑하는 로컬 Mock 사전
const translationMap = {
    "딸기": "strawberry", "いちご": "strawberry", "strawberry": "strawberry",
    "사과": "apple", "りんご": "apple", "apple": "apple",
    "소고기": "beef", "beef": "beef",
    "돼지고기": "pork", "pork": "pork",
    "닭고기": "chicken", "chicken": "chicken",
    "마늘": "garlic", "garlic": "garlic",
    "토마토": "tomato", "tomato": "tomato",
    "후추": "pepper", "pepper": "pepper",
    "아스파탐": "aspartame", "aspartame": "aspartame",
    "식품첨가물": "aspartame", "향신료": "pepper"
};

// 백엔드 API 서버(Ruby) 연동을 통한 실시간 데이터 Fetch
async function fetchIngredientData(query) {
    // 1. Loading UI 및 원산지 정보 초기화
    const insightEl = document.getElementById('core-insight');
    insightEl.innerHTML = `
        <p class="desc placeholder">세계 최고의 정밀한 데이터베이스(USDA, MFDS, MHLW)에서 [${query}] 데이터를 분석 중입니다. 잠시만 기다려주세요...</p>
        <span style="font-size: 14px; color: #4CAF50;">🔄 동기화 진행 중...</span>
    `;

    try {
        // 서버 파이프라인(Ruby 앱)의 통합 검색 API 호출
        // 배포 환경: 프론트엔드가 Rails에서 서빙되므로 동일 origin 사용
        // 로컬 개발: 프론트엔드(8080)와 백엔드(3000)가 분리된 경우 fallback
        const API_BASE = window.location.port === '8080' ? 'http://localhost:3000' : window.location.origin;
        const response = await fetch(`${API_BASE}/api/v1/ingredients/search?query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error(`API 통신 에러: ${response.status} - 백엔드 서버가 구동 중인지 확인하세요.`);
        }

        const resultData = await response.json();

        // 결과가 배열이고 2개 이상의 항목을 가질 경우 선택 모달을 표시 (전략 B)
        if (Array.isArray(resultData) && resultData.length > 1) {
            showSelectionModal(resultData);
        } else {
            // 결과가 배열이고 1개이거나, 단일 객체일 경우 바로 렌더링
            const singleData = Array.isArray(resultData) ? resultData[0] : resultData;
            renderBentoGrid(singleData);
        }

    } catch (error) {
        console.error("백엔드 데이터 연동 오류:", error);

        // 검색 실패 시 Fallback 데이터 표출 및 UI 복구
        const fallback = generateFallbackData(query);
        renderBentoGrid(fallback);
        alert(`데이터 통신 오류: 백엔드 서버(localhost:3000) 상태를 확인해주세요. 시뮬레이션 데이터를 표출합니다.\n\nError: ${error.message}`);
    }
}

// 다중 결과 선택 모달 표시 함수 (전략 B 구현)
function showSelectionModal(results) {
    const modal = document.getElementById('selection-modal');
    const modalList = document.getElementById('modal-list');
    const closeBtn = document.getElementById('modal-close-btn');

    // 기존 리스트 초기화
    modalList.innerHTML = '';

    // 받아온 배열 데이터를 순회하며 DOM 생성
    results.forEach((item, index) => {
        const li = document.createElement('li');
        // 전략 A 적용: FDC ID 및 원본 정보 노출
        const fdcIdText = item.fdcId !== "N/A" ? `[FDC\u00A0ID:\u00A0${item.fdcId}]` : '';

        li.innerHTML = `
            <strong style="color: var(--accent-color);">${item.description}</strong>
            <span style="font-size: 13px; color: var(--text-muted);">${fdcIdText} 정확도 판별 및 오차율 모델 기반</span>
        `;

        // 아이템 클릭 시 해당 데이터 렌더링 후 모달 닫기
        li.addEventListener('click', () => {
            renderBentoGrid(item);
            closeModal();
        });
        modalList.appendChild(li);
    });

    // 닫기 버튼: 배열의 첫 번째 값(기본값)을 렌더링
    closeBtn.onclick = () => {
        renderBentoGrid(results[0]);
        closeModal();
    };

    // 모달 활성화
    modal.classList.add('active');

    function closeModal() {
        modal.classList.remove('active');
    }
}

// 오프라인/동적 PWA 환경 대응 자동 생성 모의 데이터
function generateFallbackData(query) {
    return {
        name: query.toUpperCase(),
        insight: `'${query}'에 대한 정확한 분석 데이터가 로컬 DB에 없습니다. (시뮬레이션 데이터를 표출합니다.)`,
        origin: "Data Sources: Simulated Placeholder (Not real data)",
        compliance: {
            MFDS: "데이터베이스 미탑재 규격. 실 규격 확인 바람.",
            USDA: "USDA 영양 성분 매칭 불가.",
            MHLW: "MHLW 포지티브 리스트 검증 불가."
        },
        handling: [
            "단백질: 2.5 g", "지방: 0.5 g", "탄수화물: 12.0 g", "열량(에너지): 60.0 kcal",
            "당류: 5.0 g", "나트륨: 2.0 mg", "콜레스테롤: 0.0 mg", "포화지방: 0.1 g", "트랜스지방: 0.0 g"
        ],
        chartData: [
            { label: "단백질", value: 2.5 }, { label: "지방", value: 0.5 }, { label: "탄수화물", value: 12.0 },
            { label: "열량(에너지)", value: 60.0 }, { label: "당류", value: 5.0 }, { label: "나트륨", value: 2.0 },
            { label: "콜레스테롤", value: 0.0 }, { label: "포화지방", value: 0.1 }, { label: "트랜스지방", value: 0.0 }
        ]
    };
}

function renderBentoGrid(data) {
    // 1. Core Insight 및 원산지 정보
    const insightEl = document.getElementById('core-insight');
    insightEl.innerHTML = `
        <p class="desc" style="margin-bottom: 12px;">${data.insight}</p>
        <span style="font-size: 14px; color: #4CAF50;">🌐 ${data.origin || '원산지 정보 없음'}</span>
    `;

    // 2. 3국 규격 비교
    const originEl = document.getElementById('origin-comparison');
    let compareHtml = '';
    for (const [country, rule] of Object.entries(data.compliance)) {
        compareHtml += `
            <div class="compare-card">
                <strong>${country} (규격/법적기준)</strong>
                <p class="desc">${rule}</p>
            </div>
        `;
    }
    originEl.innerHTML = compareHtml;

    // 3. 체크리스트 (영양 성분)
    const handlingEl = document.getElementById('handling-checklist');
    let checklistHtml = '';
    data.handling.forEach(item => {
        checklistHtml += `<li>${item}</li>`;
    });
    handlingEl.innerHTML = checklistHtml;

    // 4. 막대 차트 (Chart.js 연동)
    renderBarChart(data.chartData, data.name);
}

// Chart.js 인스턴스 전역 관리용 변수
let currentChart = null;

function renderBarChart(chartData, foodName) {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;

    // 기존 차트 파괴 (캔버스 재사용을 위해 필수)
    if (currentChart) {
        currentChart.destroy();
    }

    if (!chartData || chartData.length === 0) return;

    const labels = chartData.map(d => d.label);
    const dataValues = chartData.map(d => d.value);

    Chart.defaults.color = '#f1f1f1';
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = 'Pretendard, "Malgun Gothic", sans-serif';

    currentChart = new Chart(ctx, {
        type: 'bar', // 방사형 차트(radar)에서 막대 그래프(bar)로 변경
        data: {
            labels: labels,
            datasets: [{
                label: `${foodName} - 9대 주요 성분 지표`,
                data: dataValues,
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94A3B8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#E2E8F0', font: { size: 12 } }
                }
            },
            plugins: {
                legend: { labels: { color: '#f1f1f1' } }
            }
        }
    });
}
