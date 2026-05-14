/**
 * PayGuard 支付保障平台 - Main Application JS
 */

'use strict';

// =========================================
// Global Data Store
// =========================================
const PayGuard = {
  data: {
    companies: [],
    invoices: [],
    payments: [],
    policies: [],
    claims: [],
    creditScores: [],
    financingApps: []
  },
  loaded: false
};

// =========================================
// CSV Parsing & Data Loading
// =========================================
function loadCSV(filename) {
  return new Promise((resolve, reject) => {
    if (typeof Papa === 'undefined') {
      // Fallback: load Papa Parse dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
      script.onload = () => fetchAndParse(filename, resolve, reject);
      script.onerror = () => reject(new Error('Failed to load Papa Parse'));
      document.head.appendChild(script);
    } else {
      fetchAndParse(filename, resolve, reject);
    }
  });
}

function fetchAndParse(filename, resolve, reject) {
  Papa.parse(`data/${filename}`, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => resolve(results.data),
    error: (err) => reject(err)
  });
}

async function loadAllData() {
  try {
    const [companies, invoices, payments, policies, claims, creditScores, financingApps] = await Promise.all([
      loadCSV('companies.csv'),
      loadCSV('invoices.csv'),
      loadCSV('payments.csv'),
      loadCSV('insurance_policies.csv'),
      loadCSV('claims.csv'),
      loadCSV('credit_scores.csv'),
      loadCSV('financing_applications.csv')
    ]);

    PayGuard.data.companies = companies;
    PayGuard.data.invoices = invoices;
    PayGuard.data.payments = payments;
    PayGuard.data.policies = policies;
    PayGuard.data.claims = claims;
    PayGuard.data.creditScores = creditScores;
    PayGuard.data.financingApps = financingApps;
    PayGuard.loaded = true;

    // Fire custom event
    document.dispatchEvent(new CustomEvent('payguard:dataLoaded', { detail: PayGuard.data }));
    return PayGuard.data;
  } catch (err) {
    console.error('Failed to load PayGuard data:', err);
    document.dispatchEvent(new CustomEvent('payguard:dataError', { detail: err }));
  }
}

// =========================================
// Utility Functions
// =========================================

/**
 * Format NTD currency
 * @param {number|string} amount
 * @param {boolean} compact - Use M/K abbreviation
 */
function formatNTD(amount, compact = false) {
  const n = parseInt(amount) || 0;
  if (compact) {
    if (n >= 1000000) return `NT$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `NT$${(n / 1000).toFixed(0)}K`;
  }
  return `NT$${n.toLocaleString('zh-TW')}`;
}

/**
 * Format date string to TW format
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get days since a date
 */
function getDaysAgo(dateStr) {
  if (!dateStr) return null;
  const today = new Date('2026-05-15'); // Current date from context
  const d = new Date(dateStr);
  const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Get days until a date
 */
function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date('2026-05-15');
  const d = new Date(dateStr);
  const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const map = {
    'paid': '已付款',
    'pending': '待付款',
    'overdue': '逾期',
    'insured': '已投保',
    'active': '生效中',
    'expired': '已到期',
    'claimed': '已理賠',
    'cancelled': '已取消',
    'approved': '已核准',
    'rejected': '已拒絕',
    'processing': '處理中',
    'completed': '已完成',
    'failed': '失敗'
  };
  const label = map[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

/**
 * Get method badge HTML
 */
function getMethodBadge(method) {
  if (method === 'bank_transfer') {
    return `<span class="badge" style="background:rgba(59,91,219,0.08);color:var(--blue-primary)">銀行轉帳</span>`;
  }
  if (method === 'TWQR') {
    return `<span class="badge" style="background:rgba(147,51,234,0.08);color:var(--purple-accent)">台灣Pay QR</span>`;
  }
  return `<span class="badge">${method}</span>`;
}

/**
 * Get credit grade badge
 */
function getGradeBadge(grade) {
  const cls = grade ? grade.replace('+', '\\+').replace('-', '-') : '';
  return `<span class="badge badge-${grade || ''}" style="font-size:0.8rem">${grade || '-'}</span>`;
}

/**
 * Lookup company name by ID
 */
function getCompanyName(id) {
  const company = PayGuard.data.companies.find(c => c.company_id === id);
  return company ? company.company_name : id;
}

// =========================================
// Navigation Setup
// =========================================
function initNavigation() {
  const currentPath = window.location.pathname;
  const currentPage = currentPath.split('/').pop() || 'index.html';

  const navLinks = document.querySelectorAll('.nav-item[href]');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    }
  });
}

// =========================================
// Mobile Sidebar Toggle
// =========================================
function initSidebar() {
  const hamburger = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

// =========================================
// Table Sorting
// =========================================
function initTableSorting(tableEl) {
  if (!tableEl) return;
  const headers = tableEl.querySelectorAll('thead th[data-sort]');
  let currentSort = { col: null, dir: 'asc' };

  headers.forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.col = col;
        currentSort.dir = 'asc';
      }

      headers.forEach(h => {
        h.classList.remove('sorted-asc', 'sorted-desc');
      });
      th.classList.add(`sorted-${currentSort.dir}`);

      const tbody = tableEl.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr:not(.expand-row)'));

      rows.sort((a, b) => {
        const aVal = a.dataset[col] || a.cells[parseInt(th.dataset.colIndex || 0)]?.textContent || '';
        const bVal = b.dataset[col] || b.cells[parseInt(th.dataset.colIndex || 0)]?.textContent || '';

        const aNum = parseFloat(aVal.replace(/[^\d.-]/g, ''));
        const bNum = parseFloat(bVal.replace(/[^\d.-]/g, ''));

        let comparison;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          comparison = aVal.localeCompare(bVal, 'zh-TW');
        }

        return currentSort.dir === 'asc' ? comparison : -comparison;
      });

      rows.forEach(row => {
        tbody.appendChild(row);
        // Move associated expand row if exists
        const nextEl = row.nextElementSibling;
        if (nextEl && nextEl.classList.contains('expand-row')) {
          tbody.appendChild(nextEl);
        }
      });
    });
  });
}

// =========================================
// Toast Notifications
// =========================================
function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;color:var(--success)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    error: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;color:var(--danger)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;color:var(--warning)"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;color:var(--blue-primary)"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// =========================================
// Pagination
// =========================================
function createPagination(totalItems, currentPage, itemsPerPage, onPageChange) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const wrap = document.createElement('div');
  wrap.className = 'pagination';

  const info = document.createElement('span');
  info.className = 'pagination-info';
  info.textContent = `顯示第 ${start}–${end} 筆，共 ${totalItems} 筆`;

  const btns = document.createElement('div');
  btns.className = 'pagination-btns';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '‹';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));

  btns.appendChild(prevBtn);

  // Page number buttons
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === currentPage ? ' active' : ''}`;
    btn.textContent = i;
    const page = i;
    btn.addEventListener('click', () => onPageChange(page));
    btns.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '›';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));

  btns.appendChild(nextBtn);
  wrap.appendChild(info);
  wrap.appendChild(btns);
  return wrap;
}

// =========================================
// SVG Icons
// =========================================
const Icons = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>`,
  creditCard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12,2 20,7 4,7"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  trending: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>`,
  money: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>`
};

// Sidebar HTML generator
function getSidebarHTML(activePage) {
  return `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <a href="index.html" class="logo-wrap" style="text-decoration:none">
          <svg class="logo-icon" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)"/>
            <path d="M20 6L8 12v8c0 7 5.5 13.5 12 15.5C27.5 33.5 33 27 33 20v-8L20 6z" fill="white" opacity="0.9"/>
            <path d="M20 10L11 15v7c0 5.5 4 10 9 12 5-2 9-6.5 9-12v-7L20 10z" fill="rgba(59,91,219,0.7)"/>
            <path d="M16 20l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="logo-text">
            <span class="logo-name">PayGuard</span>
            <span class="logo-tagline">支付保障平台</span>
          </div>
        </a>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">主要功能</div>
        <a href="dashboard.html" class="nav-item${activePage === 'dashboard' ? ' active' : ''}">
          ${Icons.grid}
          <span>儀表板</span>
        </a>
        <a href="invoices.html" class="nav-item${activePage === 'invoices' ? ' active' : ''}">
          ${Icons.document}
          <span>發票管理</span>
        </a>
        <a href="payments.html" class="nav-item${activePage === 'payments' ? ' active' : ''}">
          ${Icons.creditCard}
          <span>支付管理</span>
        </a>
        <div class="nav-section-label">風險保障</div>
        <a href="insurance.html" class="nav-item${activePage === 'insurance' ? ' active' : ''}">
          ${Icons.shield}
          <span>保險管理</span>
        </a>
        <a href="credit.html" class="nav-item${activePage === 'credit' ? ' active' : ''}">
          ${Icons.chart}
          <span>信用評分</span>
        </a>
        <div class="nav-section-label">融資服務</div>
        <a href="financing.html" class="nav-item${activePage === 'financing' ? ' active' : ''}">
          ${Icons.bank}
          <span>融資媒合</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">陳</div>
          <div class="user-info">
            <div class="user-name">陳小明</div>
            <div class="user-company">台灣精密零件有限公司</div>
          </div>
          <button class="logout-btn" title="登出" onclick="showToast('即將登出...', 'info')">
            ${Icons.logout}
          </button>
        </div>
      </div>
    </aside>
    <button class="hamburger" onclick="document.querySelector('.sidebar').classList.toggle('open'); document.querySelector('.sidebar-overlay').classList.toggle('open')">
      ${Icons.menu}
    </button>
    <div class="sidebar-overlay" onclick="document.querySelector('.sidebar').classList.remove('open'); this.classList.remove('open')"></div>
  `;
}

// =========================================
// Chart.js Default Config
// =========================================
function getChartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { family: "'Noto Sans TC', sans-serif", size: 12 },
          color: '#475569'
        }
      },
      tooltip: {
        backgroundColor: '#1E2A5E',
        titleFont: { family: "'Noto Sans TC', sans-serif", size: 12 },
        bodyFont: { family: "'Noto Sans TC', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8
      }
    }
  };
}

// =========================================
// Initialization
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSidebar();

  // Load data
  if (document.body.dataset.requiresData !== 'false') {
    loadAllData();
  }
});

// Export utilities to window
window.PayGuard = PayGuard;
window.loadAllData = loadAllData;
window.formatNTD = formatNTD;
window.formatDate = formatDate;
window.getDaysAgo = getDaysAgo;
window.getDaysUntil = getDaysUntil;
window.getStatusBadge = getStatusBadge;
window.getMethodBadge = getMethodBadge;
window.getGradeBadge = getGradeBadge;
window.getCompanyName = getCompanyName;
window.showToast = showToast;
window.createPagination = createPagination;
window.initTableSorting = initTableSorting;
window.getSidebarHTML = getSidebarHTML;
window.Icons = Icons;
window.getChartDefaults = getChartDefaults;
