/**
 * 흙에살다 Frontend App Logic
 * Ruby on Rails Backend + USDA/MFDS/MHLW + CODEX/FAO/NACMCF 위해요소분석
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

const API_BASE = (() => {
    const loc = window.location;
    if (loc.port === '8080' || loc.protocol === 'file:') return 'http://localhost:3000';
    return loc.origin;
})();

// ===================== 백엔드 API 연동 =====================
async function fetchIngredientData(query) {
    const insightEl = document.getElementById('core-insight');
    insightEl.innerHTML = `
        <p class="desc placeholder">세계 최고의 정밀한 데이터베이스(USDA, MFDS, MHLW)에서 [${query}] 데이터를 분석 중입니다. 잠시만 기다려주세요...</p>
        <span style="font-size: 14px; color: #4CAF50;">🔄 동기화 진행 중...</span>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/v1/ingredients/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`API 통신 에러: ${response.status}`);

        const resultData = await response.json();

        if (Array.isArray(resultData) && resultData.length > 1) {
            showInlineMultiSelect(resultData);
            renderBentoGrid(resultData[0]);
        } else {
            hideMultiSelect();
            const singleData = Array.isArray(resultData) ? resultData[0] : resultData;
            renderBentoGrid(singleData);
        }

    } catch (error) {
        console.error("백엔드 데이터 연동 오류:", error);
        const fallback = generateFallbackData(query);
        hideMultiSelect();
        renderBentoGrid(fallback);
        alert(`데이터 통신 오류: 시뮬레이션 데이터를 표출합니다.\n\nError: ${error.message}`);
    }
}

// ===================== 다중 식재료 인라인 선택 (종합평가 옆 가로 배열) =====================
function showInlineMultiSelect(results) {
    const section = document.getElementById('section-multi-select');
    const insightSection = document.getElementById('section-insight');
    const list = document.getElementById('multi-select-list');

    list.innerHTML = '';

    results.forEach((item, idx) => {
        const li = document.createElement('li');
        const fdcText = item.fdcId !== "N/A" ? `FDC: ${item.fdcId}` : '';
        const sourceBadge = item.dataSource ? `<span class="source-badge">${item.dataSource}</span>` : '';

        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <strong>${item.description || item.name}</strong>
                ${sourceBadge}
            </div>
            <span>${fdcText} · 정확도 판별 기반</span>
        `;
        if (idx === 0) li.classList.add('selected');

        li.addEventListener('click', () => {
            // 클릭 피드백: 이전 선택 해제 → 새 선택 활성화
            list.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
            li.classList.add('selected');
            renderBentoGrid(item);
        });

        list.appendChild(li);
    });

    // 다중 결과 → insight 1칸, multi-select 2칸  
    section.style.display = 'flex';
    insightSection.classList.remove('insight-full');
}

function hideMultiSelect() {
    const section = document.getElementById('section-multi-select');
    const insightSection = document.getElementById('section-insight');
    section.style.display = 'none';
    insightSection.classList.add('insight-full');
}

// ===================== Fallback 데이터 =====================
function generateFallbackData(query) {
    return {
        name: query.toUpperCase(),
        insight: `'${query}'에 대한 정확한 분석 데이터가 로컬 DB에 없습니다. (시뮬레이션 데이터를 표출합니다.)`,
        origin: "Data Sources: Simulated Placeholder",
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
        ],
        hazards: null
    };
}

// ===================== 벤토 그리드 렌더링 =====================
function renderBentoGrid(data) {
    // 1. Core Insight
    const insightEl = document.getElementById('core-insight');
    insightEl.innerHTML = `
        <p class="desc" style="margin-bottom: 12px;">${data.insight}</p>
        <span style="font-size: 14px; color: #4CAF50;">🌐 ${data.origin || '원산지 정보 없음'}</span>
    `;

    // 2. 3국 규격 비교
    const originEl = document.getElementById('origin-comparison');
    let compareHtml = '';
    if (data.compliance) {
        for (const [country, rule] of Object.entries(data.compliance)) {
            compareHtml += `
                <div class="compare-card">
                    <strong>${country} (규격/법적기준)</strong>
                    <p class="desc">${rule}</p>
                </div>
            `;
        }
    }
    originEl.innerHTML = compareHtml;

    // 3. 체크리스트 (영양 성분)
    const handlingEl = document.getElementById('handling-checklist');
    let checklistHtml = '';
    if (data.handling && data.handling.length > 0) {
        data.handling.forEach(item => {
            checklistHtml += `<li>${item}</li>`;
        });
    } else {
        checklistHtml = '<li>영양 성분 데이터 없음</li>';
    }
    handlingEl.innerHTML = checklistHtml;

    // 4. 막대 차트 (Chart.js)
    renderBarChart(data.chartData, data.name);

    // 5. 위해요소분석 (CODEX/FAO/NACMCF)
    renderHazards(data.hazards);
}

// ===================== 위해요소분석 렌더링 =====================
function renderHazards(hazards) {
    const section = document.getElementById('section-hazard');
    const grid = document.getElementById('hazard-grid');

    if (!hazards) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'flex';

    const renderCol = (title, cls, icon, items) => {
        const rows = (items || []).map(i => `
            <div class="hazard-item">
                <div class="hazard-item-name">${i.name}</div>
                <div style="margin: 6px 0;">
                    <span class="hazard-item-risk risk-${riskClass(i.risk)}">위험: ${i.risk}</span>
                    ${i.probability ? `<span class="hazard-item-risk" style="background: rgba(100,116,139,0.2); color: #cbd5e1; margin-left: 4px;">발생: ${i.probability}</span>` : ''}
                </div>
                <div class="hazard-item-ctrl">관리: ${i.control}</div>
            </div>
        `).join('');
        return `
            <div class="hazard-column">
                <div class="hazard-title ${cls}">${icon} ${title}</div>
                ${rows || '<p style="color:var(--text-muted);font-size:12px;">데이터 없음</p>'}
            </div>
        `;
    };

    grid.innerHTML = `
        ${renderCol('미생물적 위해', 'bio', '🦠', hazards.microbial)}
        ${renderCol('이화학적 위해', 'chem', '🧪', hazards.chemical)}
        ${renderCol('물리적 위해', 'phys', '⚙️', hazards.physical)}
        <div class="hazard-sources">
            📚 출처: ${(hazards.sources || ['CODEX Alimentarius', 'FAO/WHO', 'NACMCF']).join(' · ')}
        </div>
    `;
}

function riskClass(risk) {
    if (risk === '높음') return 'high';
    if (risk === '중간') return 'mid';
    return 'low';
}

// ===================== Chart.js 막대 그래프 =====================
let currentChart = null;

function renderBarChart(chartData, foodName) {
    const container = document.getElementById('radar-chart-container');
    if (!container) return;

    // 캔버스 재생성 (재검색 시 안전)
    if (currentChart) { currentChart.destroy(); currentChart = null; }
    container.innerHTML = '<canvas id="radarChart"></canvas>';

    const ctx = document.getElementById('radarChart');
    if (!chartData || chartData.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">영양 데이터 없음</p>';
        return;
    }

    const labels = chartData.map(d => d.label);
    const dataValues = chartData.map(d => d.value);

    Chart.defaults.color = '#f1f1f1';
    Chart.defaults.font.size = 14;
    Chart.defaults.font.family = 'Pretendard, "Malgun Gothic", sans-serif';

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${foodName || '식재료'} - 9대 주요 성분 지표`,
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
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94A3B8' } },
                x: { grid: { display: false }, ticks: { color: '#E2E8F0', font: { size: 12 } } }
            },
            plugins: { legend: { labels: { color: '#f1f1f1' } } }
        }
    });
}
