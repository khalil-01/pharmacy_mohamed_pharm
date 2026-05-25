const pages = [
  'loginPage',
  'dashboardPage',
  'salesPage',
  'myInvoicesPage',
  'notificationsPage',
  'verificationPage',
  'invoicePage',
  'debtsPage',
  'stockPage',
  'productsPage',
  'stockEntryPage',
  'reportsPage',
  'usersPage',
  'branchesPage',
  'settingsPage',
];

const roleLabels = {
  manager: 'مدير',
  stock: 'مخزن',
  seller: 'بائع',
};

const dataSeedVersion = 'warehouse-import-20260425-1';

const storageKeys = {
  currentUser: 'pharmacy_current_user',
  currentPage: 'pharmacy_current_page',
  products: 'pharmacy_saved_products',
  invoices: 'pharmacy_saved_sales_invoices',
  debts: 'pharmacy_saved_debts', 
  stockEntries: 'pharmacy_saved_stock_orders',
  notifications: 'pharmacy_saved_notifications',
  settings: 'pharmacy_saved_settings',
  syncQueue: 'pharmacy_sync_queue',
  syncSnapshot: 'pharmacy_mobile_sync_payload',
  dataSeedVersion: 'pharmacy_data_seed_version',
};

const appState = {
  currentUser: null,
  selectedInvoiceId: null,
  invoiceReturnPage: 'salesPage',
  currentSaleItems: [],
  currentWarehouseOrderItems: [],
  lastSaleProductId: null,
  lastWarehouseOrderProductContext: '',
  loginRequestInFlight: false,
  managerSaleScopeType: 'warehouse',
  managerSaleBranchId: '',
  syncQueue: [],
};

function initThemeToggle() {
  const saved = localStorage.getItem('pharmacy_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateThemeIcon();

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme');
      const isDark = current === 'dark' ||
        (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('pharmacy_theme', next);
      updateThemeIcon();
    });
  }
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const theme = document.documentElement.getAttribute('data-theme');
  const isDark = theme === 'dark' ||
    (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  btn.textContent = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  await loadBootstrapData();
  applyDataSeedResetIfNeeded();
  loadPersistedLocalData();
  normalizeProductsCollection();
  normalizeInvoicesCollection();
  normalizeDebtsCollection();
  normalizeWarehouseOrdersCollection();
  normalizeNotificationsCollection();
  persistAppData();
  bindStaticEvents();
  renderBranding();

  const isLoginPage = Boolean(document.getElementById('loginPage'));
  const hasAppShell = Boolean(document.getElementById('dashboardPage'));
  const restoredUser = restoreCurrentUserSession();

  if (isLoginPage) {
    if (restoredUser) {
      redirectToAppPage();
      return;
    }

    resetLoginForm();
    return;
  }

  if (hasAppShell && !restoredUser) {
    redirectToLoginPage();
    return;
  }

  if (hasAppShell) {
    initializeAuthenticatedApp();
  }
});

function redirectToLoginPage() {
  window.location.href = 'login.html';
}

function redirectToAppPage() {
  window.location.href = 'index.html';
}

function persistCurrentUserSession(user) {
  try {
    window.localStorage.setItem(storageKeys.currentUser, JSON.stringify(user));
  } catch (error) {
    console.warn('Failed to persist current user session.', error);
  }
}

function restoreCurrentUserSession() {
  try {
    const storedUser = window.localStorage.getItem(storageKeys.currentUser);
    if (!storedUser) return null;

    const parsedUser = JSON.parse(storedUser);
    if (!parsedUser?.id) return null;

    const freshUser = mockData.users.find(user => user.id === parsedUser.id || user.username === parsedUser.username);
    appState.currentUser = freshUser || parsedUser;
    return appState.currentUser;
  } catch (error) {
    console.warn('Failed to restore current user session.', error);
    return null;
  }
}

function clearCurrentUserSession() {
  try {
    window.localStorage.removeItem(storageKeys.currentUser);
    window.localStorage.removeItem(storageKeys.currentPage);
  } catch (error) {
    console.warn('Failed to clear current user session.', error);
  }
}

function persistCurrentPage(pageId) {
  if (!pageId || pageId === 'loginPage') return;

  try {
    window.localStorage.setItem(storageKeys.currentPage, pageId);
  } catch (error) {
    console.warn('Failed to persist current page.', error);
  }
}

function restoreCurrentPage() {
  try {
    return window.localStorage.getItem(storageKeys.currentPage);
  } catch (error) {
    console.warn('Failed to restore current page.', error);
    return null;
  }
}

function bindStaticEvents() {
  addEvent('loginForm', 'submit', handleLoginSubmit);
  addEvent('saleProductSearchInput', 'input', renderSaleProducts);
  addEvent('saleProductSelect', 'change', updateSalePricingFields);
  addEvent('saleScopeTypeSelect', 'change', handleManagerSaleScopeChange);
  addEvent('saleScopeBranchSelect', 'change', handleManagerSaleScopeChange);
  addEvent('saleTypeSelect', 'change', updateSalePricingFields);
  addEvent('saleQuantityInput', 'input', updateSalePricingFields);
  addEvent('salePriceInput', 'input', updateSalePricingFields);
  addEvent('saleCustomerNameInput', 'input', renderCurrentSaleMeta);
  addEvent('saleCustomerPhoneInput', 'input', renderCurrentSaleMeta);
  addEvent('salePaymentMethodSelect', 'change', renderCurrentSaleMeta);
  addEvent('stockSearchInput', 'input', renderStockTable);
  addEvent('productsSearchInput', 'input', renderProductsTable);
  addEvent('stockEntryCategorySelect', 'change', renderStockEntryProducts);
  addEvent('stockEntryDestinationTypeSelect', 'change', renderStockEntryDestinations);
  addEvent('stockEntryDestinationSelect', 'change', renderCurrentWarehouseOrderMeta);
  addEvent('stockEntryProductSearchInput', 'input', renderStockEntryProducts);
  addEvent('stockEntryProductSelect', 'change', updateWarehouseOrderProductDefaults);
  addEvent('stockOrderWholesaleCustomerInput', 'input', renderCurrentWarehouseOrderMeta);
  addEvent('stockOrderWholesalePhoneInput', 'input', renderCurrentWarehouseOrderMeta);
  addEvent('stockOrderPrioritySelect', 'change', renderCurrentWarehouseOrderMeta);
  addEvent('stockOrderReferenceInput', 'input', renderCurrentWarehouseOrderMeta);
  addEvent('stockOrderQuantityInput', 'input', updateWarehouseOrderProductDefaults);
  addEvent('stockOrderPriceInput', 'input', updateWarehouseOrderProductDefaults);
  addEvent('stockOrdersSearchInput', 'input', renderWarehouseOrdersList);
  addEvent('stockOrdersStatusFilter', 'change', renderWarehouseOrdersList);
  addEvent('invoiceSearchInput', 'input', renderInvoicesList);
  addEvent('debtSearchInput', 'input', renderDebtsTable);
  addEvent('verificationSearchInput', 'input', renderVerificationTable);
  addEvent('settingsPharmacyName', 'change', handleSettingsChange);
  addEvent('settingsCurrency', 'change', handleSettingsChange);
}

function addEvent(id, eventName, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function showPage(pageId) {
  const targetPage = resolveTargetPage(pageId);
  const activePage = getActivePageId();

  if (targetPage === 'invoicePage' && activePage && activePage !== 'invoicePage') {
    appState.invoiceReturnPage = activePage;
  }

  pages.forEach(id => {
    const page = document.getElementById(id);
    if (page) page.classList.add('hidden');
  });

  const page = document.getElementById(targetPage);
  if (page) page.classList.remove('hidden');

  if (appState.currentUser && targetPage !== 'loginPage') {
    persistCurrentPage(targetPage);
  }

  if (targetPage === 'salesPage') {
    renderCurrentSaleInvoice();
    renderCurrentSaleMeta();
  }

  if (targetPage === 'myInvoicesPage') renderInvoicesList();
  if (targetPage === 'notificationsPage') renderNotificationsList();
  if (targetPage === 'verificationPage') renderVerificationTable();
  if (targetPage === 'invoicePage') renderInvoiceDetails();
  if (targetPage === 'debtsPage') renderDebtsTable();
  if (targetPage === 'stockPage') renderStockTable();
  if (targetPage === 'productsPage') renderProductsTable();
  if (targetPage === 'stockEntryPage') renderStockEntryCategories();
  if (targetPage === 'branchesPage') renderBranchesTable();
  if (targetPage === 'settingsPage') renderSettings();
  renderGlobalNotificationBanner();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getActivePageId() {
  return pages.find(id => {
    const page = document.getElementById(id);
    return page && !page.classList.contains('hidden');
  }) || null;
}

function goBackFromInvoicePage() {
  showPage(appState.invoiceReturnPage || getHomePage());
}

function resolveTargetPage(pageId) {
  if (!appState.currentUser) {
    if (!document.getElementById('loginPage')) {
      redirectToLoginPage();
    }
    return 'loginPage';
  }

  return canAccessPage(pageId) ? pageId : getHomePage();
}

function canAccessPage(pageId) {
  if (pageId === 'loginPage') return true;
  if (!appState.currentUser) return false;

  const role = appState.currentUser.role;

  if (role === 'manager') return true;
  if (role === 'stock') {
    return ['dashboardPage', 'stockPage', 'productsPage', 'stockEntryPage', 'myInvoicesPage', 'notificationsPage', 'invoicePage', 'debtsPage'].includes(pageId);
  }
  if (role === 'seller') {
    return ['salesPage', 'productsPage', 'myInvoicesPage', 'notificationsPage', 'invoicePage', 'debtsPage'].includes(pageId);
  }

  return false;
}

function getHomePage() {
  if (!appState.currentUser) return 'loginPage';
  return appState.currentUser.role === 'seller' ? 'salesPage' : 'dashboardPage';
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  if (appState.loginRequestInFlight) return;

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!username || !password) {
    setLoginError('أدخل اسم المستخدم وكلمة المرور.');
    return;
  }

  setLoginLoading(true);
  setLoginError('');

  try {
    const user = await loginViaApi(username, password);
    loginUser(user);
  } catch (error) {
    const errorMessage = error?.code === 'API_UNAVAILABLE'
      ? 'تعذر الاتصال بالسيرفر. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.'
      : (error?.message || 'تعذر تسجيل الدخول.');

    setLoginError(errorMessage);
    passwordInput.focus();
    passwordInput.select();
    setLoginLoading(false);
  }
}

function loginAsUser(userId) {
  const user = mockData.users.find(item => item.id === userId);
  if (user) {
    loginUser(user);
  }
}

function loginUser(user) {
  appState.currentUser = user;
  persistCurrentUserSession(user);
  appState.selectedInvoiceId = getVisibleInvoices({ includePending: true })[0]?.id || null;
  appState.invoiceReturnPage = user.role === 'seller' ? 'salesPage' : 'myInvoicesPage';
  appState.currentSaleItems = [];
  appState.currentWarehouseOrderItems = [];
  appState.lastSaleProductId = null;
  appState.lastWarehouseOrderProductContext = '';
  appState.managerSaleScopeType = 'warehouse';
  appState.managerSaleBranchId = mockData.branches[0]?.id || '';
  initializeAuthenticatedApp();

  if (document.getElementById('loginPage') && !document.getElementById('dashboardPage')) {
    redirectToAppPage();
    return;
  }

  resetLoginForm();
}

function logout() {
  appState.currentUser = null;
  clearCurrentUserSession();
  appState.selectedInvoiceId = null;
  appState.invoiceReturnPage = 'salesPage';
  appState.currentSaleItems = [];
  appState.currentWarehouseOrderItems = [];
  appState.lastSaleProductId = null;
  appState.lastWarehouseOrderProductContext = '';
  appState.managerSaleScopeType = 'warehouse';
  appState.managerSaleBranchId = mockData.branches[0]?.id || '';
  setSaleSaveMessage('');

  if (document.getElementById('loginPage')) {
    resetLoginForm();
    showPage('loginPage');
    return;
  }

  redirectToLoginPage();
}

function initializeAuthenticatedApp() {
  if (!appState.currentUser) return;

  normalizeProductsCollection();
  normalizeInvoicesCollection();
  normalizeDebtsCollection();
  normalizeWarehouseOrdersCollection();
  normalizeNotificationsCollection();
  syncSettingsIntoPharmacy();

  if (!appState.managerSaleBranchId) {
    appState.managerSaleBranchId = mockData.branches[0]?.id || '';
  }

  appState.selectedInvoiceId = getVisibleInvoices({ includePending: true })[0]?.id || appState.selectedInvoiceId || null;

  toggleAppHeader(true);
  applyRoleVisibility();
  updateSessionBadges();
  renderShellHeader();
  renderGlobalNotificationBanner();
  renderManagerSaleControls();
  renderBranding();
  renderSettings();
  renderDashboardStats();
  renderInvoicesList();
  renderNotificationsList();
  renderVerificationTable();
  renderInvoiceDetails();
  renderDebtsTable();
  renderStockTable();
  renderProductsTable();
  renderUsersTable();
  renderBranchesTable();
  renderSaleProducts();
  renderCurrentSaleInvoice();
  renderCurrentSaleMeta();
  renderStockEntryCategories();
  setSaleSaveMessage('');
  setLoginLoading(false);

  const restoredPage = restoreCurrentPage();
  showPage(restoredPage || getHomePage());
}

function toggleAppHeader(isVisible) {
  const header = document.getElementById('appShellHeader');
  if (header) {
    header.classList.toggle('hidden', !isVisible);
  }
}

function applyRoleVisibility() {
  const role = appState.currentUser?.role;

  document.querySelectorAll('.seller-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'seller');
  });

  document.querySelectorAll('.manager-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'manager');
  });

  document.querySelectorAll('.stock-only').forEach(el => {
    el.classList.toggle('hidden', !['stock', 'manager'].includes(role));
  });
}

function updateSessionBadges() {
  const user = appState.currentUser;
  if (!user) return;

  const branchLabel = getUserScopeLabel(user, 'session');
  const roleLabel = roleLabels[user.role] || user.role;

  document.querySelectorAll('.current-role').forEach(el => {
    el.textContent = roleLabel;
  });

  document.querySelectorAll('.current-branch').forEach(el => {
    el.textContent = branchLabel;
  });

  document.querySelectorAll('.current-user').forEach(el => {
    el.textContent = user.username;
  });

  const salesInvoicesButton = document.getElementById('salesInvoicesButton');
  if (salesInvoicesButton) {
    salesInvoicesButton.textContent = user.role === 'manager' ? 'كل الفواتير' : 'فواتير الفرع';
  }
}

function renderShellHeader() {
  setText('headerLastSyncAt', mockData.settings.lastSyncAt || 'لم تتم بعد');
  setText('headerPendingOperations', String(mockData.settings.pendingOperations || 0));
  setText('headerNotificationsCount', String(getUnreadNotificationsCount()));

  const contextText = document.getElementById('headerContextText');
  const notificationsButton = document.getElementById('headerNotificationsButton');
  if (notificationsButton) {
    const unreadCount = getUnreadNotificationsCount();
    notificationsButton.textContent = unreadCount > 0 ? `الإشعارات (${unreadCount})` : 'الإشعارات';
    notificationsButton.classList.toggle('btn-warning', unreadCount > 0);
    notificationsButton.classList.toggle('btn-light', unreadCount <= 0);
  }

  if (!contextText || !appState.currentUser) return;

  contextText.textContent = `المستخدم الحالي: ${appState.currentUser.name || appState.currentUser.username} | الفرع: ${getUserScopeLabel(appState.currentUser, 'session')}`;
}

function getSortedNotificationsCollection(notifications = mockData.notifications || []) {
  return [...notifications].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function getVisibleNotifications() {
  if (!appState.currentUser) return [];

  const notifications = getSortedNotificationsCollection();
  if (appState.currentUser.role === 'manager') return notifications;
  if (appState.currentUser.role === 'stock' && !appState.currentUser.branchId) return notifications;

  return notifications.filter(notification => notification.branchId === appState.currentUser.branchId);
}

function isNotificationUnread(notification) {
  if (!appState.currentUser) return false;
  return !Array.isArray(notification?.readBy) || !notification.readBy.includes(appState.currentUser.id);
}

function getUnreadNotifications() {
  return getVisibleNotifications().filter(isNotificationUnread);
}

function getUnreadNotificationsCount() {
  return getUnreadNotifications().length;
}

function renderNotificationsList() {
  const container = document.getElementById('notificationsList');
  if (!container) return;

  const notifications = getVisibleNotifications();
  if (!notifications.length) {
    container.innerHTML = '<div class="list-card"><p class="page-note">لا توجد إشعارات للفروع حاليًا.</p></div>';
    return;
  }

  container.innerHTML = notifications.map(notification => {
    const unread = isNotificationUnread(notification);
    const branchLabel = notification.branchId ? getBranchById(notification.branchId)?.name || 'فرع' : 'كل الفروع';

    return `
      <div class="list-card ${unread ? 'notification-card-unread' : ''}">
        <div class="branch-overview-header">
          <div>
            <h4>${notification.title}</h4>
            <div class="list-meta">
              <span class="tag ${unread ? 'tag-debt' : 'tag-paid'}">${unread ? 'جديد' : 'مقروء'}</span>
              <span>${branchLabel}</span>
              <span>${notification.orderNumber || '-'}</span>
              <span>${notification.createdAt}</span>
            </div>
          </div>
          <div class="table-actions">
            ${unread ? `<button class="btn btn-light" type="button" onclick="markNotificationRead('${notification.id}')">تمت القراءة</button>` : ''}
          </div>
        </div>
        <p class="page-note">${notification.message}</p>
        ${notification.itemsPreview?.length ? `<p class="page-note">الأصناف: ${notification.itemsPreview.join(' / ')}</p>` : ''}
      </div>
    `;
  }).join('');
}

function renderGlobalNotificationBanner() {
  const banner = document.getElementById('globalNotificationBanner');
  if (!banner) return;

  const unreadNotifications = getUnreadNotifications();
  if (!unreadNotifications.length) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }

  const latestNotification = unreadNotifications[0];
  banner.classList.remove('hidden');
  banner.innerHTML = `
    <div class="card notification-banner-card">
      <div class="branch-overview-header">
        <div>
          <h4>تمت إضافة مخزون جديد للفرع</h4>
          <p class="page-note">${latestNotification.message}</p>
        </div>
        <div class="table-actions">
          <button class="btn btn-light" type="button" onclick="showPage('notificationsPage')">عرض الإشعارات (${unreadNotifications.length})</button>
          <button class="btn btn-primary" type="button" onclick="markNotificationRead('${latestNotification.id}')">فهمت</button>
        </div>
      </div>
    </div>
  `;
}

function markNotificationRead(notificationId) {
  if (!appState.currentUser) return;

  const notificationIndex = (mockData.notifications || []).findIndex(item => item.id === notificationId);
  if (notificationIndex === -1) return;

  const notification = normalizeNotificationsCollectionItem(mockData.notifications[notificationIndex]);
  if (notification.readBy.includes(appState.currentUser.id)) return;

  mockData.notifications[notificationIndex] = {
    ...notification,
    readBy: [...notification.readBy, appState.currentUser.id],
  };

  normalizeNotificationsCollection();
  persistAppData();
  renderShellHeader();
  renderGlobalNotificationBanner();
  renderNotificationsList();
}

function markAllVisibleNotificationsRead() {
  if (!appState.currentUser) return;

  const visibleIds = new Set(getVisibleNotifications().map(notification => notification.id));
  let hasChanges = false;
  mockData.notifications = (mockData.notifications || []).map(notification => {
    const normalized = normalizeNotificationsCollectionItem(notification);
    if (!visibleIds.has(normalized.id)) {
      return normalized;
    }

    if (normalized.readBy.includes(appState.currentUser.id)) {
      return normalized;
    }

    hasChanges = true;
    return {
      ...normalized,
      readBy: [...normalized.readBy, appState.currentUser.id],
    };
  });

  if (!hasChanges) return;

  normalizeNotificationsCollection();
  persistAppData();
  renderShellHeader();
  renderGlobalNotificationBanner();
  renderNotificationsList();
}

function normalizeNotificationsCollectionItem(notification) {
  return {
    ...notification,
    id: notification?.id || `notify-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    readBy: Array.isArray(notification?.readBy) ? notification.readBy : [],
    itemsPreview: Array.isArray(notification?.itemsPreview) ? notification.itemsPreview : [],
  };
}

function resetLoginForm() {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');

  if (form) form.reset();
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';

  setLoginError('');

  if (!appState.currentUser && usernameInput) {
    usernameInput.focus();
  }
}

function setLoginError(message) {
  const errorBox = document.getElementById('loginError');
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.toggle('hidden', !message);
}

function setLoginLoading(isLoading) {
  appState.loginRequestInFlight = isLoading;

  const submitButton = document.querySelector('#loginForm button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? 'جاري الدخول...' : 'دخول';
}

async function loadBootstrapData() {
  try {
    const response = await fetch('api/bootstrap.php', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return;

    const payload = await response.json();
    if (!payload?.success) return;

    if (payload.settings) {
      mockData.settings = { ...mockData.settings, ...payload.settings };
    }

    if (payload.pharmacy) {
      mockData.pharmacy = { ...mockData.pharmacy, ...payload.pharmacy };
    }

    if (Array.isArray(payload.branches)) {
      mockData.branches = payload.branches;
    }

    if (Array.isArray(payload.users)) {
      mockData.users = payload.users;
    }

    if (Array.isArray(payload.categories)) {
      mockData.categories = payload.categories;
    }

    if (Array.isArray(payload.products)) {
      mockData.products = payload.products;
    }

    if (Array.isArray(payload.stockEntries)) {
      mockData.stockEntries = payload.stockEntries;
    }

    if (Array.isArray(payload.salesInvoices)) {
      mockData.salesInvoices = payload.salesInvoices;
    }

    if (Array.isArray(payload.debts)) {
      mockData.debts = payload.debts;
    }
  } catch (error) {
    console.warn('Bootstrap API unavailable, falling back to local data.', error);
  }
}

function applyDataSeedResetIfNeeded() {
  try {
    const appliedVersion = window.localStorage.getItem(storageKeys.dataSeedVersion);
    if (appliedVersion === dataSeedVersion) return;

    [
      storageKeys.products,
      storageKeys.invoices,
      storageKeys.debts,
      storageKeys.stockEntries,
      storageKeys.notifications,
      storageKeys.settings,
      storageKeys.syncQueue,
      storageKeys.syncSnapshot,
      storageKeys.currentPage,
    ].forEach(key => window.localStorage.removeItem(key));

    window.localStorage.setItem(storageKeys.dataSeedVersion, dataSeedVersion);
  } catch (error) {
    console.warn('Failed to reset legacy seeded data.', error);
  }
}

function loadPersistedLocalData() {
  try {
    const storedProducts = window.localStorage.getItem(storageKeys.products);
    const storedInvoices = window.localStorage.getItem(storageKeys.invoices);
    const storedDebts = window.localStorage.getItem(storageKeys.debts);
    const storedStockEntries = window.localStorage.getItem(storageKeys.stockEntries);
    const storedNotifications = window.localStorage.getItem(storageKeys.notifications);
    const storedSettings = window.localStorage.getItem(storageKeys.settings);
    const storedQueue = window.localStorage.getItem(storageKeys.syncQueue);

    if (storedProducts) {
      const parsedProducts = JSON.parse(storedProducts);
      if (Array.isArray(parsedProducts)) {
        mockData.products = parsedProducts;
      }
    }

    if (storedInvoices) {
      const parsedInvoices = JSON.parse(storedInvoices);
      if (Array.isArray(parsedInvoices)) {
        mockData.salesInvoices = parsedInvoices;
      }
    }

    if (storedDebts) {
      const parsedDebts = JSON.parse(storedDebts);
      if (Array.isArray(parsedDebts)) {
        mockData.debts = parsedDebts;
      }
    }

    if (storedStockEntries) {
      const parsedStockEntries = JSON.parse(storedStockEntries);
      if (Array.isArray(parsedStockEntries)) {
        mockData.stockEntries = parsedStockEntries;
      }
    }

    if (storedNotifications) {
      const parsedNotifications = JSON.parse(storedNotifications);
      if (Array.isArray(parsedNotifications)) {
        mockData.notifications = parsedNotifications;
      }
    }

    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      if (parsedSettings && typeof parsedSettings === 'object') {
        mockData.settings = sanitizeSettingsRecord(parsedSettings, mockData.settings);
      }
    }

    if (storedQueue) {
      const parsedQueue = JSON.parse(storedQueue);
      if (Array.isArray(parsedQueue)) {
        appState.syncQueue = parsedQueue;
      }
    }

    mockData.settings.pendingOperations = appState.syncQueue.length || Number(mockData.settings.pendingOperations || 0);
    syncSettingsIntoPharmacy();
  } catch (error) {
    console.warn('Failed to load persisted data.', error);
  }
}

function persistAppData() {
  try {
    window.localStorage.setItem(storageKeys.products, JSON.stringify(mockData.products));
    window.localStorage.setItem(storageKeys.invoices, JSON.stringify(mockData.salesInvoices));
    window.localStorage.setItem(storageKeys.debts, JSON.stringify(mockData.debts));
    window.localStorage.setItem(storageKeys.stockEntries, JSON.stringify(mockData.stockEntries));
    window.localStorage.setItem(storageKeys.notifications, JSON.stringify(mockData.notifications || []));
    window.localStorage.setItem(storageKeys.settings, JSON.stringify(mockData.settings));
    window.localStorage.setItem(storageKeys.syncQueue, JSON.stringify(appState.syncQueue));
  } catch (error) {
    console.warn('Failed to persist app data.', error);
  }
}

function queueSyncOperation(type, payload = {}) {
  appState.syncQueue.unshift({
    id: `sync-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    payload,
    userId: appState.currentUser?.id || null,
    occurredAt: getNowDateTime(),
  });

  mockData.settings.pendingOperations = appState.syncQueue.length;
  persistAppData();
  renderShellHeader();
  renderSettings();
}

function syncNow() {
  if (!appState.currentUser) return;

  const pendingCount = appState.syncQueue.length;
  const syncedAt = getNowDateTime();
  const syncPayload = {
    syncedAt,
    syncedBy: appState.currentUser.username,
    pharmacy: mockData.pharmacy,
    settings: mockData.settings,
    products: mockData.products,
    invoices: mockData.salesInvoices,
    debts: mockData.debts,
    stockOrders: mockData.stockEntries,
    notifications: mockData.notifications || [],
  };

  try {
    window.localStorage.setItem(storageKeys.syncSnapshot, JSON.stringify(syncPayload));
  } catch (error) {
    console.warn('Failed to write sync snapshot.', error);
  }

  appState.syncQueue = [];
  mockData.settings.lastSyncAt = syncedAt;
  mockData.settings.pendingOperations = 0;
  syncSettingsIntoPharmacy();
  persistAppData();
  renderShellHeader();
  renderSettings();

  window.alert(
    pendingCount > 0
      ? `تمت المزامنة المحلية بنجاح، وتم تجهيز ${pendingCount} عملية للحفظ أو النقل إلى الجوال.`
      : 'تم تحديث حالة المزامنة وتجهيز آخر نسخة من البيانات للجوال.'
  );
}

function handleSettingsChange() {
  const nameInput = document.getElementById('settingsPharmacyName');
  const currencyInput = document.getElementById('settingsCurrency');
  if (!nameInput || !currencyInput) return;

  const nextPharmacyName = pickCleanText(
    nameInput.value,
    pickCleanText(mockData.settings.pharmacyName, pickCleanText(mockData.pharmacy?.name, 'نظام إدارة الصيدلية'))
  );
  const nextCurrency = pickCleanText(
    currencyInput.value,
    pickCleanText(mockData.settings.currency, pickCleanText(mockData.pharmacy?.currency, '₪'))
  );

  const nextSettings = sanitizeSettingsRecord({
    ...mockData.settings,
    pharmacyName: nextPharmacyName,
    currency: nextCurrency,
  }, mockData.settings);
  const hasChanged = nextSettings.pharmacyName !== mockData.settings.pharmacyName || nextSettings.currency !== mockData.settings.currency;
  if (!hasChanged) return;

  mockData.settings = nextSettings;
  syncSettingsIntoPharmacy();
  renderBranding();
  renderSettings();
  queueSyncOperation('settings_update', {
    pharmacyName: nextSettings.pharmacyName,
    currency: nextSettings.currency,
  });
}

async function loginViaApi(username, password) {
  let response;

  try {
    response = await fetch('api/login.php', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    const apiError = new Error('API unavailable');
    apiError.code = 'API_UNAVAILABLE';
    throw apiError;
  }

  let payload;

  try {
    payload = await response.json();
  } catch (error) {
    const apiError = new Error('Invalid API response');
    apiError.code = 'API_UNAVAILABLE';
    throw apiError;
  }

  if (!response.ok || !payload?.success) {
    const authError = new Error(payload?.message || 'تعذر تسجيل الدخول.');
    authError.code = response.status >= 500 ? 'API_UNAVAILABLE' : 'AUTH_FAILED';
    throw authError;
  }

  return payload.user;
}

function normalizeProductsCollection() {
  if (!Array.isArray(mockData.products)) {
    mockData.products = [];
    return;
  }

  mockData.products = mockData.products.map(normalizeProductRecord);
}

function normalizeProductRecord(product) {
  return {
    ...product,
    id: product?.id || `product-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: product?.name || 'دواء',
    categoryId: product?.categoryId || '',
    baseUnit: pickCleanText(product?.baseUnit, 'علبة'),
    purchasePrice: parseFlexibleNumber(product?.purchasePrice, 0),
    wholesalePrice: parseFlexibleNumber(product?.wholesalePrice, product?.salePrice ?? 0),
    salePrice: parseFlexibleNumber(product?.salePrice, 0),
    stockQty: Math.max(0, parseFlexibleNumber(product?.stockQty, 0)),
    lowStockThreshold: Math.max(0, parseFlexibleNumber(product?.lowStockThreshold, 0)),
    branchId: product?.branchId ?? null,
    supplierName: pickCleanText(product?.supplierName, ''),
    expiryDate: product?.expiryDate || '',
    notes: product?.notes || '',
  };
}

function normalizeInvoicesCollection() {
  if (!Array.isArray(mockData.salesInvoices)) {
    mockData.salesInvoices = [];
    return;
  }

  mockData.salesInvoices = mockData.salesInvoices.map(normalizeInvoiceRecord);
}

function normalizeInvoiceRecord(invoice) {
  const items = Array.isArray(invoice?.items)
    ? invoice.items.map(item => ({
        ...item,
        quantity: Math.max(0, parseFlexibleNumber(item?.quantity, 0)),
        salePrice: parseFlexibleNumber(item?.salePrice, 0),
        profit: parseFlexibleNumber(item?.profit, 0),
        saleType: item?.saleType || '-',
        productName: item?.productName || getProductById(item?.productId)?.name || 'دواء',
      }))
    : [];

  let paymentMethod = invoice?.paymentMethod;
  if (!paymentMethod) {
    if (invoice?.invoiceType === 'debt') {
      paymentMethod = 'debt';
    } else if (invoice?.invoiceType === 'pending_verification') {
      paymentMethod = 'transfer';
    } else {
      paymentMethod = 'cash';
    }
  }

  let verificationStatus = invoice?.verificationStatus;
  if (!verificationStatus) {
    verificationStatus = paymentMethod === 'transfer'
      ? (invoice?.invoiceType === 'paid' ? 'verified' : 'pending')
      : 'verified';
  }

  if (paymentMethod !== 'transfer') {
    verificationStatus = 'verified';
  }

  const total = parseFlexibleNumber(
    invoice?.total,
    items.reduce((sum, item) => sum + (Number(item.salePrice || 0) * Number(item.quantity || 0)), 0)
  );

  const profit = parseFlexibleNumber(invoice?.profit, sumBy(items, 'profit'));

  return {
    ...invoice,
    id: invoice?.id || `inv-${invoice?.invoiceNumber || Date.now()}`,
    invoiceNumber: Number(invoice?.invoiceNumber || 0),
    branchId: invoice?.branchId ?? null,
    sourceLabel: invoice?.sourceLabel || getFallbackSourceLabel(invoice?.branchId),
    sellerId: invoice?.sellerId || '',
    customerName: invoice?.customerName || invoice?.customer || '',
    customerPhone: invoice?.customerPhone || invoice?.phone || '',
    createdAt: invoice?.createdAt || getTodayDate(),
    confirmedAt: invoice?.confirmedAt || null,
    notes: invoice?.notes || '',
    paymentMethod,
    verificationStatus,
    invoiceType: deriveInvoiceType(paymentMethod, verificationStatus),
    total,
    profit,
    items,
  };
}

function normalizeDebtsCollection() {
  if (!Array.isArray(mockData.debts)) {
    mockData.debts = [];
    return;
  }

  mockData.debts = mockData.debts.map(normalizeDebtRecord);
}

function normalizeDebtRecord(debt) {
  const linkedInvoice = getInvoiceById(debt?.invoiceId);
  const originalAmount = Math.max(0, parseFlexibleNumber(debt?.originalAmount ?? debt?.amount, linkedInvoice?.total || 0));
  const explicitPaidAmount = parseFlexibleNumber(debt?.paidAmount, Number.NaN);
  const explicitRemainingAmount = parseFlexibleNumber(debt?.remainingAmount, Number.NaN);

  let paidAmount = 0;
  let remainingAmount = originalAmount;

  if (debt?.status === 'paid') {
    paidAmount = originalAmount;
    remainingAmount = 0;
  } else if (Number.isFinite(explicitPaidAmount)) {
    paidAmount = Math.min(Math.max(explicitPaidAmount, 0), originalAmount);
    remainingAmount = Math.max(originalAmount - paidAmount, 0);
  } else if (Number.isFinite(explicitRemainingAmount)) {
    remainingAmount = Math.min(Math.max(explicitRemainingAmount, 0), originalAmount);
    paidAmount = Math.max(originalAmount - remainingAmount, 0);
  }

  const status = remainingAmount <= 0
    ? 'paid'
    : paidAmount > 0
      ? 'partial'
      : 'pending';

  const paymentHistory = Array.isArray(debt?.paymentHistory)
    ? debt.paymentHistory.map(payment => ({
        amount: parseFlexibleNumber(payment?.amount, 0),
        paidAt: payment?.paidAt || getTodayDate(),
      }))
    : [];

  return {
    ...debt,
    id: debt?.id || `debt-${linkedInvoice?.invoiceNumber || Date.now()}`,
    invoiceId: debt?.invoiceId || linkedInvoice?.id || null,
    branchId: debt?.branchId || linkedInvoice?.branchId || null,
    customerName: debt?.customerName || linkedInvoice?.customerName || 'بدون اسم',
    phone: debt?.phone || linkedInvoice?.customerPhone || '',
    amount: originalAmount,
    originalAmount,
    paidAmount,
    remainingAmount,
    status,
    createdAt: debt?.createdAt || linkedInvoice?.createdAt || getTodayDate(),
    lastPaymentAt: debt?.lastPaymentAt || null,
    notes: debt?.notes || linkedInvoice?.notes || '',
    paymentHistory,
  };
}

function normalizeWarehouseOrdersCollection() {
  if (!Array.isArray(mockData.stockEntries)) {
    mockData.stockEntries = [];
    return;
  }

  mockData.stockEntries = mockData.stockEntries.map(normalizeWarehouseOrderRecord);
}

function normalizeNotificationsCollection() {
  if (!Array.isArray(mockData.notifications)) {
    mockData.notifications = [];
    return;
  }

  mockData.notifications = mockData.notifications.map(notification => ({
    ...normalizeNotificationsCollectionItem(notification),
    branchId: notification?.branchId || null,
    orderId: notification?.orderId || null,
    orderNumber: notification?.orderNumber || '',
    title: notification?.title || 'إشعار جديد',
    message: notification?.message || '',
    createdAt: notification?.createdAt || getNowDateTime(),
  }));
}

function normalizeWarehouseOrderRecord(entry) {
  const isStructuredOrder = Array.isArray(entry?.items);
  const orderType = entry?.orderType || entry?.destinationType || (entry?.branchId ? 'branch' : 'wholesale');
  const destinationId = entry?.destinationId || (orderType === 'branch' ? entry?.branchId || '' : entry?.destinationId || '');
  const branch = getBranchById(destinationId);
  const destinationName = orderType === 'branch'
    ? (entry?.destinationName || (branch ? `فرع ${branch.branchNumber} - ${branch.name}` : 'فرع غير محدد'))
    : (entry?.destinationName || entry?.wholesaleCustomerName || entry?.customerName || entry?.supplierName || 'عميل جملة');
  const product = getProductById(entry?.productId);

  const items = isStructuredOrder
    ? entry.items.map(item => normalizeWarehouseOrderItem(item, orderType))
    : [
        normalizeWarehouseOrderItem({
          productId: entry?.productId,
          productName: entry?.productName || product?.name,
          categoryId: entry?.categoryId || product?.categoryId,
          unit: entry?.unit || product?.baseUnit || 'علبة',
          quantity: entry?.quantity,
          unitPrice: entry?.unitPrice ?? entry?.purchasePrice ?? getDefaultWarehouseOrderUnitPrice(product, orderType),
          expiryDate: entry?.expiryDate || product?.expiryDate || '',
        }, orderType),
      ];

  const total = parseFlexibleNumber(entry?.total, sumBy(items, 'lineTotal'));
  const rawNumber = entry?.orderNumber || entry?.referenceNumber || entry?.id || Date.now();
  const orderNumber = String(rawNumber).startsWith('ORD-') ? String(rawNumber) : `ORD-${rawNumber}`;
  const status = entry?.status || (isStructuredOrder ? 'draft' : 'completed');

  return {
    ...entry,
    id: entry?.id || `order-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    orderNumber,
    orderType,
    destinationType: orderType,
    destinationId,
    destinationName,
    wholesaleCustomerName: orderType === 'wholesale' ? destinationName : '',
    wholesalePhone: entry?.wholesalePhone || entry?.phone || '',
    priority: entry?.priority || 'normal',
    referenceNumber: entry?.referenceNumber || '',
    notes: entry?.notes || '',
    status,
    createdAt: entry?.createdAt || getNowDateTime(),
    createdBy: entry?.createdBy || entry?.userId || appState.currentUser?.id || '',
    total,
    items,
  };
}

function normalizeWarehouseOrderItem(item, orderType = 'branch') {
  const product = getProductById(item?.productId);
  const quantity = Math.max(1, parseFlexibleNumber(item?.quantity, 1));
  const unitPrice = parseFlexibleNumber(item?.unitPrice ?? item?.purchasePrice, getDefaultWarehouseOrderUnitPrice(product, orderType));

  return {
    ...item,
    productId: item?.productId || product?.id || '',
    productName: item?.productName || product?.name || 'دواء',
    categoryId: item?.categoryId || product?.categoryId || '',
    unit: item?.unit || product?.baseUnit || 'علبة',
    quantity,
    unitPrice,
    expiryDate: item?.expiryDate || product?.expiryDate || '',
    lineTotal: parseFlexibleNumber(item?.lineTotal, unitPrice * quantity),
  };
}

function getDefaultWarehouseOrderUnitPrice(product, orderType = 'branch') {
  if (!product) return 0;
  return orderType === 'wholesale'
    ? parseFlexibleNumber(product.wholesalePrice ?? product.salePrice, 0)
    : parseFlexibleNumber(product.purchasePrice, 0);
}

function deriveInvoiceType(paymentMethod, verificationStatus) {
  if (paymentMethod === 'debt') return 'debt';
  if (paymentMethod === 'transfer' && verificationStatus === 'pending') return 'pending_verification';
  return 'paid';
}

function syncSettingsIntoPharmacy() {
  const pharmacyName = pickCleanText(
    mockData.settings?.pharmacyName,
    pickCleanText(mockData.pharmacy?.name, 'نظام إدارة الصيدلية')
  );
  const currency = pickCleanText(
    mockData.settings?.currency,
    pickCleanText(mockData.pharmacy?.currency, '₪')
  );
  const lastSyncAt = pickCleanText(
    mockData.settings?.lastSyncAt,
    pickCleanText(mockData.pharmacy?.lastSyncAt, '')
  );

  mockData.settings.pharmacyName = pharmacyName;
  mockData.settings.currency = currency;
  mockData.settings.lastSyncAt = lastSyncAt;
  mockData.pharmacy.name = pharmacyName;
  mockData.pharmacy.currency = currency;
  mockData.pharmacy.lastSyncAt = lastSyncAt;
}

function renderDashboardStats() {
  const stats = getVisibleStats();

  setText('dashboardSalesValue', formatCurrency(stats.todaySales));
  setText('dashboardProfitValue', formatCurrency(stats.todayProfit));
  setText('dashboardInvoicesValue', String(stats.todayInvoices));
  setText('dashboardDebtsValue', formatCurrency(stats.currentDebts));

  setText('reportsSalesValue', formatCurrency(stats.todaySales));
  setText('reportsProfitValue', formatCurrency(stats.todayProfit));
  setText('reportsDebtsValue', formatCurrency(stats.currentDebts));
  setText('reportsInvoicesValue', String(stats.todayInvoices));
}

function renderInvoicesList() {
  const container = document.getElementById('myInvoicesList');
  if (!container) return;

  updateInvoicesPageTitle();

  const invoices = getFilteredInvoices();
  if (!invoices.length) {
    container.innerHTML = `<div class="list-card"><p class="page-note">${getEmptyInvoicesMessage()}</p></div>`;
    return;
  }

  if (appState.currentUser?.role === 'manager') {
    container.innerHTML = buildManagerInvoicesMarkup(invoices);
    return;
  }

  container.innerHTML = invoices.map(invoice => buildInvoiceCardMarkup(invoice)).join('');
}

function getFilteredInvoices() {
  const searchTerm = getInputValue('invoiceSearchInput');
  const invoices = getVisibleInvoices();

  return invoices.filter(invoice => matchesSearchTerm(searchTerm, [
    invoice.invoiceNumber,
    getInvoiceCustomerName(invoice),
    getInvoiceCustomerPhone(invoice),
    getSellerLabel(getUserById(invoice.sellerId)),
    getInvoiceScopeLabel(invoice),
  ]));
}

function buildManagerInvoicesMarkup(invoices) {
  const groupedInvoices = groupInvoicesByScopeAndSeller(invoices);

  return groupedInvoices.map(group => `
    <div class="branch-overview-card">
      <div class="branch-overview-header">
        <div>
          <h4>${group.scopeLabel}</h4>
          <div class="branch-overview-stats">
            <span>${group.sellerGroups.length} بائع</span>
            <span>${group.invoices.length} فواتير</span>
            <span>مبيعات ${formatCurrency(sumBy(group.invoices, 'total'))}</span>
            <span>ربح ${formatCurrency(sumInvoicesRealizedProfit(group.invoices))}</span>
          </div>
        </div>
      </div>
      <div class="branch-sellers-list">
        ${group.sellerGroups.map(sellerGroup => buildSellerInvoiceGroupMarkup(sellerGroup)).join('')}
      </div>
    </div>
  `).join('');
}

function buildSellerInvoiceGroupMarkup(group) {
  const seller = group.seller;
  const sellerLabel = getSellerLabel(seller);
  const roleLabel = roleLabels[seller?.role] || seller?.role || 'مستخدم';

  return `
    <div class="seller-overview-card">
      <div class="branch-overview-header">
        <div>
          <h4>${sellerLabel}</h4>
          <div class="seller-overview-meta">
            <span>${group.invoices.length} فواتير</span>
            <span>مبيعات ${formatCurrency(group.total)}</span>
            <span>ربح ${formatCurrency(sumInvoicesRealizedProfit(group.invoices))}</span>
          </div>
        </div>
        <span class="tag tag-paid">${roleLabel}</span>
      </div>
      ${group.invoices.length
        ? `<div class="seller-invoices-list">${group.invoices.map(invoice => buildInvoiceCardMarkup(invoice, { hideSeller: true })).join('')}</div>`
        : '<p class="page-note">لا توجد فواتير جاهزة لهذا البائع حتى الآن.</p>'}
    </div>
  `;
}

function buildInvoiceCardMarkup(invoice, options = {}) {
  const branchLabel = getInvoiceScopeLabel(invoice);
  const sellerLabel = getSellerLabel(getUserById(invoice.sellerId));
  const itemNames = (invoice.items || []).map(item => item.productName).join(' / ');
  const invoiceDisplay = getInvoiceDisplayMeta(invoice);
  const customerName = getInvoiceCustomerName(invoice);
  const customerLabel = customerName ? `الزبون: ${customerName}` : 'بدون اسم';
  const meta = [
    `<span>${invoice.createdAt || '-'}</span>`,
    `<span>${customerLabel}</span>`,
    options.hideBranch ? '' : `<span>${branchLabel}</span>`,
    options.hideSeller ? '' : `<span>الموظف: ${sellerLabel}</span>`,
    `<span class="tag ${invoiceDisplay.className}">${invoiceDisplay.label}</span>`,
    `<span>${formatCurrency(invoice.total)}</span>`,
  ].filter(Boolean).join('');

  return `
    <div class="list-card invoice-clickable" onclick="openInvoice('${invoice.id}')">
      <h4>فاتورة #${invoice.invoiceNumber}</h4>
      <div class="list-meta">${meta}</div>
      <p class="page-note">${(invoice.items || []).length} أصناف${itemNames ? ` - ${itemNames}` : ''}</p>
    </div>
  `;
}

function groupInvoicesByScopeAndSeller(invoices) {
  const groups = new Map();

  invoices.forEach(invoice => {
    const scopeKey = getInvoiceScopeKey(invoice);

    if (!groups.has(scopeKey)) {
      groups.set(scopeKey, {
        scopeKey,
        scopeLabel: getInvoiceScopeLabel(invoice),
        branchId: invoice.branchId || null,
        invoices: [],
      });
    }

    groups.get(scopeKey).invoices.push(invoice);
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    sellerGroups: getSellerInvoiceGroups({
      invoices: group.invoices,
      branchId: group.branchId,
      includeUsersWithoutInvoices: false,
    }),
  }));
}

function getSellerInvoiceGroups({ invoices, branchId = null, includeUsersWithoutInvoices = false }) {
  const sellerIds = new Set(
    (invoices || [])
      .map(invoice => invoice.sellerId)
      .filter(Boolean)
  );

  if (includeUsersWithoutInvoices && branchId) {
    mockData.users
      .filter(user => user.role === 'seller' && user.branchId === branchId)
      .forEach(user => sellerIds.add(user.id));
  }

  return Array.from(sellerIds).map(sellerId => {
    const seller = getUserById(sellerId) || {
      id: sellerId,
      name: 'مستخدم غير معروف',
      username: sellerId,
      role: 'seller',
    };
    const sellerInvoices = (invoices || []).filter(invoice => invoice.sellerId === sellerId);

    return {
      seller,
      invoices: sellerInvoices,
      total: sumBy(sellerInvoices, 'total'),
      profit: sumInvoicesRealizedProfit(sellerInvoices),
    };
  }).sort((a, b) => getSellerLabel(a.seller).localeCompare(getSellerLabel(b.seller), 'ar'));
}

function getInvoiceScopeKey(invoice) {
  return invoice?.branchId ? `branch:${invoice.branchId}` : `scope:${getInvoiceScopeLabel(invoice)}`;
}

function getInvoiceScopeLabel(invoice) {
  const branch = getBranchById(invoice?.branchId);
  if (branch) {
    return `فرع ${branch.branchNumber} - ${branch.name}`;
  }

  return invoice?.sourceLabel || 'المخزن المركزي';
}

function getFallbackSourceLabel(branchId) {
  const branch = getBranchById(branchId);
  return branch ? `فرع ${branch.branchNumber} - ${branch.name}` : 'المخزن المركزي';
}

function getSellerLabel(seller) {
  if (!seller) return '-';
  return seller.name && seller.username ? `${seller.name} (${seller.username})` : (seller.name || seller.username || '-');
}

function renderVerificationTable() {
  const tbody = document.getElementById('verificationTableBody');
  if (!tbody) return;

  const searchTerm = getInputValue('verificationSearchInput');
  const invoices = getPendingVerificationInvoices().filter(invoice => matchesSearchTerm(searchTerm, [
    invoice.invoiceNumber,
    invoice.customerName,
    getInvoiceScopeLabel(invoice),
    getSellerLabel(getUserById(invoice.sellerId)),
  ]));

  if (!invoices.length) {
    tbody.innerHTML = '<tr><td colspan="8">لا توجد حوالات بانتظار التحقق.</td></tr>';
    return;
  }

  tbody.innerHTML = invoices.map(invoice => `
    <tr>
      <td>#${invoice.invoiceNumber}</td>
      <td>${invoice.customerName || 'بدون اسم'}</td>
      <td>${getInvoiceScopeLabel(invoice)}</td>
      <td>${getSellerLabel(getUserById(invoice.sellerId))}</td>
      <td>${formatCurrency(invoice.total)}</td>
      <td>${invoice.createdAt}</td>
      <td><span class="tag tag-pending">بانتظار التحقق</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-light" type="button" onclick="openInvoice('${invoice.id}')">عرض</button>
          <button class="btn btn-success" type="button" onclick="confirmTransferInvoice('${invoice.id}')">تم</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function confirmTransferInvoice(invoiceId) {
  const invoiceIndex = mockData.salesInvoices.findIndex(invoice => invoice.id === invoiceId);
  if (invoiceIndex === -1) return;

  const invoice = normalizeInvoiceRecord(mockData.salesInvoices[invoiceIndex]);
  if (invoice.paymentMethod !== 'transfer' || invoice.verificationStatus !== 'pending') return;

  mockData.salesInvoices[invoiceIndex] = normalizeInvoiceRecord({
    ...invoice,
    verificationStatus: 'verified',
    confirmedAt: getNowDateTime(),
  });

  normalizeInvoicesCollection();
  queueSyncOperation('transfer_verified', { invoiceId });
  appState.selectedInvoiceId = invoiceId;

  renderDashboardStats();
  renderInvoicesList();
  renderVerificationTable();
  renderInvoiceDetails();
  renderBranchesTable();

  showPage('invoicePage');
}

function renderInvoiceDetails() {
  const invoice = getSelectedInvoice();
  const tbody = document.getElementById('invoiceDetailsBody');
  const canViewProfit = appState.currentUser?.role === 'manager';
  const invoiceDisplay = invoice ? getInvoiceDisplayMeta(invoice) : null;

  if (!tbody) return;

  if (!invoice) {
    tbody.innerHTML = `<tr><td colspan="${canViewProfit ? 5 : 4}">لا توجد فاتورة متاحة</td></tr>`;
    setText('invoiceNumberValue', '-');
    setText('invoiceBranchValue', '-');
    setText('invoiceUserValue', '-');
    setText('invoiceCustomerValue', '-');
    setText('invoicePhoneValue', '-');
    setText('invoiceDateValue', '-');
    setText('invoicePaymentMethodValue', '-');
    setText('invoiceTotalValue', formatCurrency(0));
    setText('invoiceProfitValue', formatCurrency(0));
    setText('invoiceStatusNote', 'اختر فاتورة لعرض تفاصيلها.');
    return;
  }

  setText('invoiceNumberValue', `#${invoice.invoiceNumber}`);
  setText('invoiceBranchValue', getInvoiceScopeLabel(invoice));
  setText('invoiceUserValue', getSellerLabel(getUserById(invoice.sellerId)));
  setText('invoiceCustomerValue', getInvoiceCustomerName(invoice) || 'بدون اسم');
  setText('invoicePhoneValue', getInvoiceCustomerPhone(invoice) || '-');
  setText('invoiceDateValue', invoice.createdAt || '-');
  setText('invoicePaymentMethodValue', getPaymentMethodLabel(invoice.paymentMethod));
  setText('invoiceTotalValue', formatCurrency(invoice.total));
  setText('invoiceProfitValue', formatCurrency(invoice.profit));
  setText('invoiceStatusNote', invoiceDisplay.note);

  const invoiceTypeValue = document.getElementById('invoiceTypeValue');
  if (invoiceTypeValue) {
    invoiceTypeValue.textContent = invoiceDisplay.label;
    invoiceTypeValue.className = `tag ${invoiceDisplay.className}`;
  }

  if (!invoice.items.length) {
    tbody.innerHTML = `<tr><td colspan="${canViewProfit ? 5 : 4}">لا توجد أصناف داخل هذه الفاتورة.</td></tr>`;
    return;
  }

  tbody.innerHTML = invoice.items.map(item => `
    <tr>
      <td>${item.productName}</td>
      <td>${item.saleType}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.salePrice)}</td>
      ${canViewProfit ? `<td>${formatCurrency(item.profit)}</td>` : ''}
    </tr>
  `).join('');
}

function renderDebtsTable() {
  const tbody = document.getElementById('debtsTableBody');
  if (!tbody) return;

  const debts = getFilteredDebts();
  if (!debts.length) {
    tbody.innerHTML = '<tr><td colspan="9">لا توجد ديون مطابقة للبحث حاليًا.</td></tr>';
    return;
  }

  tbody.innerHTML = debts.map(debt => {
    const linkedInvoice = getDebtLinkedInvoice(debt);
    return `
      <tr>
        <td>${debt.customerName || 'بدون اسم'}</td>
        <td>${debt.phone || '-'}</td>
        <td>${linkedInvoice ? `#${linkedInvoice.invoiceNumber}` : '-'}</td>
        <td>${formatCurrency(getDebtOriginalAmount(debt))}</td>
        <td>${formatCurrency(getDebtPaidAmount(debt))}</td>
        <td>${formatCurrency(getDebtRemainingAmount(debt))}</td>
        <td>${debt.createdAt}</td>
        <td><span class="tag ${getDebtStatusClass(debt)}">${getDebtStatusLabel(debt)}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-light" type="button" onclick="openInvoiceFromDebt('${debt.id}')" ${linkedInvoice ? '' : 'disabled'}>الفاتورة</button>
            <button class="btn ${getDebtActionClass(debt)}" type="button" onclick="recordDebtPayment('${debt.id}')" ${getDebtRemainingAmount(debt) <= 0 ? 'disabled' : ''}>${getDebtActionLabel(debt)}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getFilteredDebts() {
  const searchTerm = getInputValue('debtSearchInput');
  const debts = getVisibleDebts();

  return debts.filter(debt => {
    const linkedInvoice = getDebtLinkedInvoice(debt);
    return matchesSearchTerm(searchTerm, [
      debt.customerName,
      debt.phone,
      linkedInvoice?.invoiceNumber,
      linkedInvoice?.customerName,
    ]);
  });
}




function renderStockTable() {
  const tbody = document.getElementById('stockTableBody');
  if (!tbody) return;

  const products = getFilteredProducts({
    searchId: 'stockSearchInput',
    includeAllVisible: true,
  });

  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="7">لا توجد أدوية مطابقة لبحث المخزون.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => {
    const isLow = Number(product.stockQty || 0) <= Number(product.lowStockThreshold || 0);
    return `
      <tr>
        <td>${product.name}</td>
        <td>${product.stockQty} ${product.baseUnit}</td>
        <td>${formatCurrency(product.purchasePrice)}</td>
        <td>${formatCurrency(product.wholesalePrice ?? product.salePrice)}</td>
        <td>${formatCurrency(product.salePrice)}</td>
        <td>${product.expiryDate || 'غير محدد'}</td>
        <td><span class="tag ${isLow ? 'tag-low' : 'tag-paid'}">${isLow ? 'منخفض' : 'متوفر'}</span></td>
      </tr>
    `;
  }).join('');
}


function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  const headRow = document.getElementById('productsTableHeadRow');
  const note = document.getElementById('productsPageNote');
  if (!tbody) return;

  const visibleProducts = getVisibleProducts();
  const products = getFilteredProducts({
    searchId: 'productsSearchInput',
    includeAllVisible: true,
  });
  const isSeller = appState.currentUser?.role === 'seller';

  if (headRow) {
    headRow.innerHTML = isSeller
      ? '<th>الدواء</th><th>سعر البيع</th><th>تاريخ الانتهاء</th>'
      : '<th>الدواء</th><th>الصنف</th><th>شراء</th><th>جملة</th><th>بيع</th><th>المخزون</th><th>تاريخ الانتهاء</th>';
  }

  if (note) {
    note.textContent = isSeller
      ? 'هذه الصفحة مخصّصة للبائع بشكل مبسّط: اسم الدواء، سعر البيع، وتاريخ الانتهاء فقط.'
      : 'واجهة واضحة للمخزن تعرض الأدوية مع التصنيف، سعر الشراء، سعر الجملة، سعر البيع، وتاريخ الانتهاء.';
  }

  if (!products.length) {
    const emptyMessage = !visibleProducts.length && isSeller
      ? 'لم يتم توريد أصناف لهذا الفرع بعد.'
      : 'لا توجد أدوية مطابقة للبحث.';
    tbody.innerHTML = `<tr><td colspan="${isSeller ? 3 : 7}">${emptyMessage}</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(product => {
    if (isSeller) {
      return `
        <tr>
          <td>${product.name}</td>
          <td>${formatCurrency(product.salePrice)}</td>
          <td>${product.expiryDate || 'غير محدد'}</td>
        </tr>
      `;
    }

    return `
      <tr>
        <td>${product.name}</td>
        <td>${getCategoryName(product.categoryId)}</td>
        <td>${formatCurrency(product.purchasePrice)}</td>
        <td>${formatCurrency(product.wholesalePrice ?? product.salePrice)}</td>
        <td>${formatCurrency(product.salePrice)}</td>
        <td>${product.stockQty} ${product.baseUnit}</td>
        <td>${product.expiryDate || 'غير محدد'}</td>
      </tr>
    `;
  }).join('');
}

function getFilteredProducts({ searchId, includeAllVisible = false } = {}) {
  const searchTerm = searchId ? getInputValue(searchId) : '';
  const products = includeAllVisible ? getVisibleProducts() : mockData.products;

  return products.filter(product => matchesSearchTerm(searchTerm, [
    product.name,
    getCategoryName(product.categoryId),
    product.expiryDate,
    product.notes,
  ]));
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (!mockData.users.length) {
    tbody.innerHTML = '<tr><td colspan="4">لا توجد حسابات مسجلة حاليًا.</td></tr>';
    return;
  }

  tbody.innerHTML = mockData.users.map(user => `
    <tr>
      <td>${user.name}</td>
      <td>${user.username}</td>
      <td>${roleLabels[user.role] || user.role}</td>
      <td>${getUserScopeLabel(user, 'table')}</td>
    </tr>
  `).join('');
}

function renderBranchesTable() {
  const tbody = document.getElementById('branchesTableBody');
  if (!tbody) return;

  const invoices = getSortedInvoicesCollection().filter(isInvoiceReady);

  tbody.innerHTML = mockData.branches.map(branch => {
    const sellerCount = mockData.users.filter(user => user.role === 'seller' && user.branchId === branch.id).length;
    const invoiceCount = invoices.filter(invoice => invoice.branchId === branch.id).length;

    return `
      <tr>
        <td>${branch.branchNumber} - ${branch.name}</td>
        <td>${branch.city}</td>
        <td><span class="tag ${branch.status === 'active' ? 'tag-paid' : 'tag-low'}">${branch.status === 'active' ? 'نشط' : 'مغلق'}</span></td>
        <td>${sellerCount}</td>
        <td>${invoiceCount}</td>
      </tr>
    `;
  }).join('');

  renderBranchInvoicesOverview();
}

function renderBranchInvoicesOverview() {
  const container = document.getElementById('branchInvoicesOverview');
  if (!container) return;

  const invoices = getSortedInvoicesCollection().filter(isInvoiceReady);

  container.innerHTML = mockData.branches.map(branch => {
    const branchInvoices = invoices.filter(invoice => invoice.branchId === branch.id);
    const sellerGroups = getSellerInvoiceGroups({
      invoices: branchInvoices,
      branchId: branch.id,
      includeUsersWithoutInvoices: true,
    });

    return `
      <div class="branch-overview-card">
        <div class="branch-overview-header">
          <div>
            <h4>فرع ${branch.branchNumber} - ${branch.name}</h4>
            <div class="branch-overview-stats">
              <span>${sellerGroups.length} بائع</span>
              <span>${branchInvoices.length} فواتير</span>
              <span>مبيعات ${formatCurrency(sumBy(branchInvoices, 'total'))}</span>
              <span>ربح ${formatCurrency(sumInvoicesRealizedProfit(branchInvoices))}</span>
            </div>
          </div>
          <span class="tag ${branch.status === 'active' ? 'tag-paid' : 'tag-low'}">${branch.status === 'active' ? 'نشط' : 'مغلق'}</span>
        </div>
        ${sellerGroups.length
          ? `<div class="branch-sellers-list">${sellerGroups.map(group => buildSellerInvoiceGroupMarkup(group)).join('')}</div>`
          : '<p class="page-note">لا يوجد بائعون مسجلون داخل هذا الفرع حتى الآن.</p>'}
      </div>
    `;
  }).join('');
}

function renderManagerSaleControls() {
  const typeSelect = document.getElementById('saleScopeTypeSelect');
  const branchSelect = document.getElementById('saleScopeBranchSelect');
  const branchField = document.getElementById('saleScopeBranchField');
  const scopeLabel = document.getElementById('currentSaleScope');
  const scopeNote = document.getElementById('managerSaleScopeNote');

  if (!typeSelect || !branchSelect || !branchField || !scopeLabel || !scopeNote) return;

  if (appState.currentUser?.role !== 'manager') {
    branchField.classList.add('hidden');
    scopeLabel.textContent = getUserScopeLabel(appState.currentUser, 'session');
    return;
  }

  typeSelect.value = appState.managerSaleScopeType;
  branchSelect.innerHTML = mockData.branches.map(branch => `
    <option value="${branch.id}">فرع ${branch.branchNumber} - ${branch.name}</option>
  `).join('');

  if (!appState.managerSaleBranchId && mockData.branches.length) {
    appState.managerSaleBranchId = mockData.branches[0].id;
  }

  branchSelect.value = appState.managerSaleBranchId;
  branchField.classList.toggle('hidden', appState.managerSaleScopeType !== 'branch');
  scopeLabel.textContent = getCurrentSaleScopeLabel();
  scopeNote.textContent = appState.managerSaleScopeType === 'warehouse'
    ? 'المدير يبيع الآن من المخزن المركزي، ويمكنه التبديل إلى أي فرع من نفس الشاشة.'
    : `المدير يبيع الآن من ${getCurrentSaleScopeLabel()} ويمكنه العودة إلى المخزن المركزي في أي وقت.`;
}

function handleManagerSaleScopeChange() {
  if (appState.currentUser?.role !== 'manager') return;

  const typeSelect = document.getElementById('saleScopeTypeSelect');
  const branchSelect = document.getElementById('saleScopeBranchSelect');

  appState.managerSaleScopeType = typeSelect?.value === 'branch' ? 'branch' : 'warehouse';
  appState.managerSaleBranchId = branchSelect?.value || mockData.branches[0]?.id || '';
  appState.currentSaleItems = [];
  appState.lastSaleProductId = null;

  renderManagerSaleControls();
  renderSaleProducts();
  renderCurrentSaleInvoice();
}

function getCurrentSaleScopeLabel() {
  if (appState.currentUser?.role !== 'manager') {
    return getUserScopeLabel(appState.currentUser, 'session');
  }

  if (appState.managerSaleScopeType === 'warehouse') {
    return 'المخزن المركزي';
  }

  const branch = getBranchById(appState.managerSaleBranchId);
  return branch ? `فرع ${branch.branchNumber} - ${branch.name}` : 'فرع محدد';
}




function renderSaleProducts() {
  const select = document.getElementById('saleProductSelect');
  if (!select) return;

  const visibleProducts = getVisibleSaleProducts();
  const products = visibleProducts.filter(product => matchesSearchTerm(getInputValue('saleProductSearchInput'), [
    product.name,
    getCategoryName(product.categoryId),
  ]));

  select.innerHTML = products.length
    ? products.map(product => `<option value="${product.id}">${product.name}</option>`).join('')
    : '<option value="">لا توجد أدوية مطابقة للبحث</option>';

  if (!products.length && !visibleProducts.length && appState.currentUser?.role === 'seller') {
    select.innerHTML = '<option value="">لم يتم توريد بضاعة لهذا الفرع بعد</option>';
  }

  updateSalePricingFields();
}

function updateSalePricingFields() {
  const select = document.getElementById('saleProductSelect');
  if (!select) return;

  const saleProducts = getVisibleSaleProducts().filter(product => matchesSearchTerm(getInputValue('saleProductSearchInput'), [
    product.name,
    getCategoryName(product.categoryId),
  ]));

  if (!saleProducts.length) {
    setInputValue('salePurchasePriceInput', formatCurrency(0));
    setInputValue('saleProfitInput', formatCurrency(0));
    setInputValue('saleLineTotalInput', formatCurrency(0));
    return;
  }

  const product = saleProducts.find(item => item.id === select.value) || saleProducts[0];
  if (!product) return;

  const salePriceInput = document.getElementById('salePriceInput');
  const quantityInput = document.getElementById('saleQuantityInput');
  const selectedProductChanged = appState.lastSaleProductId !== product.id;

  if (select.value !== product.id) {
    select.value = product.id;
  }

  if (salePriceInput && (selectedProductChanged || !salePriceInput.value || Number.isNaN(parseFlexibleNumber(salePriceInput.value, Number.NaN)))) {
    salePriceInput.value = product.salePrice;
  }

  if (quantityInput && (!quantityInput.value || parseFlexibleNumber(quantityInput.value, 0) < 1)) {
    quantityInput.value = '1';
  }

  const quantity = Math.max(1, parseFlexibleNumber(quantityInput?.value, 1));
  const unitSalePrice = parseFlexibleNumber(salePriceInput?.value, product.salePrice);
  const lineTotal = unitSalePrice * quantity;
  const lineProfit = (unitSalePrice - product.purchasePrice) * quantity;

  setInputValue('salePurchasePriceInput', formatCurrency(product.purchasePrice));
  setInputValue('saleProfitInput', formatCurrency(lineProfit));
  setInputValue('saleLineTotalInput', formatCurrency(lineTotal));
  appState.lastSaleProductId = product.id;
}

function renderCurrentSaleMeta() {
  const customerName = getInputValue('saleCustomerNameInput');
  const paymentMethod = getInputValue('salePaymentMethodSelect') || 'cash';

  setText('currentInvoiceCustomerValue', customerName || '-');
  setText('currentInvoicePaymentValue', getPaymentMethodLabel(paymentMethod));
}

function addCurrentSaleItem() {
  const productSelect = document.getElementById('saleProductSelect');
  const saleTypeSelect = document.getElementById('saleTypeSelect');
  const quantityInput = document.getElementById('saleQuantityInput');
  const salePriceInput = document.getElementById('salePriceInput');

  if (!productSelect || !saleTypeSelect || !quantityInput || !salePriceInput) return;

  const product = getProductById(productSelect.value);
  const quantity = Math.max(1, parseFlexibleNumber(quantityInput.value, 1));
  const unitSalePrice = parseFlexibleNumber(salePriceInput.value, product?.salePrice || 0);

  if (!product || Number.isNaN(unitSalePrice) || unitSalePrice <= 0) {
    setSaleSaveMessage('اختر دواء صالحًا وأدخل سعرًا صحيحًا قبل الإضافة.', 'error');
    return;
  }

  const sourceLabel = getCurrentSaleScopeLabel();
  const saleType = saleTypeSelect.value;
  const existingItem = appState.currentSaleItems.find(item => {
    return item.productId === product.id
      && item.saleType === saleType
      && item.sourceLabel === sourceLabel
      && Number(item.unitSalePrice) === Number(unitSalePrice);
  });

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.lineTotal = existingItem.unitSalePrice * existingItem.quantity;
    existingItem.lineProfit = (existingItem.unitSalePrice - existingItem.purchasePrice) * existingItem.quantity;
  } else {
    appState.currentSaleItems.push({
      id: `line-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      sourceLabel,
      saleType,
      quantity,
      unitSalePrice,
      purchasePrice: product.purchasePrice,
      lineTotal: unitSalePrice * quantity,
      lineProfit: (unitSalePrice - product.purchasePrice) * quantity,
    });
  }

  quantityInput.value = '1';
  appState.lastSaleProductId = null;
  salePriceInput.value = '';
  updateSalePricingFields();
  setSaleSaveMessage('تمت إضافة الصنف إلى الفاتورة الحالية.', 'success');
  renderCurrentSaleInvoice();
}

function saveCurrentSaleInvoice() {
  if (!appState.currentUser) return;

  if (!appState.currentSaleItems.length) {
    setSaleSaveMessage('أضف صنفًا واحدًا على الأقل قبل حفظ الفاتورة.', 'error');
    return;
  }

  const customerName = getInputValue('saleCustomerNameInput');
  const customerPhone = getInputValue('saleCustomerPhoneInput');
  const paymentMethod = getInputValue('salePaymentMethodSelect') || 'cash';

  if (paymentMethod !== 'cash' && !customerName) {
    setSaleSaveMessage('أدخل اسم الزبون عند حفظ فاتورة دين أو حوالة.', 'error');
    return;
  }

  const invoiceNumber = getNextInvoiceNumber();
  const createdAt = getTodayDate();
  const branchId = resolveCurrentSaleBranchId();
  const sourceLabel = getCurrentSaleScopeLabel();
  const verificationStatus = paymentMethod === 'transfer' ? 'pending' : 'verified';

  const invoice = normalizeInvoiceRecord({
    id: `inv-${invoiceNumber}`,
    invoiceNumber,
    branchId,
    sourceLabel,
    sellerId: appState.currentUser.id,
    customerName,
    customerPhone,
    paymentMethod,
    verificationStatus,
    invoiceType: deriveInvoiceType(paymentMethod, verificationStatus),
    total: sumBy(appState.currentSaleItems, 'lineTotal'),
    profit: sumBy(appState.currentSaleItems, 'lineProfit'),
    createdAt,
    items: appState.currentSaleItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      saleType: item.saleType,
      quantity: item.quantity,
      salePrice: item.unitSalePrice,
      profit: item.lineProfit,
      sourceLabel: item.sourceLabel || sourceLabel,
    })),
  });

  mockData.salesInvoices.unshift(invoice);

  if (paymentMethod === 'debt') {
    mockData.debts.unshift(normalizeDebtRecord({
      id: `debt-${invoiceNumber}`,
      customerName,
      phone: customerPhone,
      amount: invoice.total,
      originalAmount: invoice.total,
      paidAmount: 0,
      remainingAmount: invoice.total,
      invoiceId: invoice.id,
      branchId: branchId,
      status: 'pending',
      notes: '',
      createdAt,
      paymentHistory: [],
    }));
  }

  normalizeInvoicesCollection();
  normalizeDebtsCollection();
  queueSyncOperation('invoice_saved', {
    invoiceId: invoice.id,
    paymentMethod,
  });

  appState.selectedInvoiceId = invoice.id;
  appState.currentSaleItems = [];
  appState.lastSaleProductId = null;
  resetCurrentSaleMetaFields();

  renderDashboardStats();
  renderInvoicesList();
  renderVerificationTable();
  renderInvoiceDetails();
  renderDebtsTable();
  renderBranchesTable();
  renderCurrentSaleInvoice();
  renderCurrentSaleMeta();
  updateSalePricingFields();

  if (paymentMethod === 'debt') {
    setSaleSaveMessage(`تم حفظ الفاتورة رقم #${invoiceNumber} كدين على ${customerName}.`, 'success');
    showPage('invoicePage');
    return;
  }

  if (paymentMethod === 'transfer') {
    setSaleSaveMessage(`تم إرسال الفاتورة رقم #${invoiceNumber} إلى شاشة التحقق.`, 'success');
    if (appState.currentUser?.role === 'manager') {
      showPage('verificationPage');
    } else {
      showPage('invoicePage');
    }
    return;
  }

  setSaleSaveMessage(`تم حفظ الفاتورة رقم #${invoiceNumber} بنجاح.`, 'success');
  showPage('invoicePage');
}

function resetCurrentSaleMetaFields() {
  setInputValue('saleCustomerNameInput', '');
  setInputValue('saleCustomerPhoneInput', '');
  setInputValue('salePaymentMethodSelect', 'cash');
}

function renderCurrentSaleInvoice() {
  const tbody = document.getElementById('currentInvoiceItemsBody');
  if (!tbody) return;

  if (!appState.currentSaleItems.length) {
    tbody.innerHTML = '<tr><td colspan="6">لا توجد أصناف مضافة في الفاتورة الحالية.</td></tr>';
    setText('currentInvoiceItemsCount', '0');
    setText('currentInvoiceTotalValue', formatCurrency(0));
    setText('currentInvoiceProfitValue', formatCurrency(0));
    return;
  }

  tbody.innerHTML = appState.currentSaleItems.map((item, index) => `
    <tr>
      <td>${item.productName}<div class="sale-item-source">${item.sourceLabel || ''}</div></td>
      <td>${item.saleType}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.unitSalePrice)}</td>
      <td>${formatCurrency(item.lineTotal)}</td>
      <td><button class="btn btn-danger invoice-remove-btn" type="button" onclick="removeCurrentSaleItem(${index})">حذف</button></td>
    </tr>
  `).join('');

  setText('currentInvoiceItemsCount', String(appState.currentSaleItems.length));
  setText('currentInvoiceTotalValue', formatCurrency(sumBy(appState.currentSaleItems, 'lineTotal')));
  setText('currentInvoiceProfitValue', formatCurrency(sumBy(appState.currentSaleItems, 'lineProfit')));
}

function removeCurrentSaleItem(index) {
  appState.currentSaleItems = appState.currentSaleItems.filter((_, itemIndex) => itemIndex !== index);
  renderCurrentSaleInvoice();
}

function clearCurrentSaleInvoice() {
  appState.currentSaleItems = [];
  appState.lastSaleProductId = null;
  resetCurrentSaleMetaFields();
  setSaleSaveMessage('');
  renderCurrentSaleInvoice();
  renderCurrentSaleMeta();
  updateSalePricingFields();
}

function renderStockEntryCategories() {
  const select = document.getElementById('stockEntryCategorySelect');
  if (!select) return;

  const categoryIds = [...new Set(getVisibleProducts().map(product => product.categoryId))];
  const categories = mockData.categories.filter(category => categoryIds.includes(category.id));

  select.innerHTML = categories.length
    ? categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')
    : '<option value="">لا توجد أصناف</option>';

  renderStockEntryProducts();
  renderStockEntryDestinations();
  renderCurrentWarehouseOrder();
  renderCurrentWarehouseOrderMeta();
  renderWarehouseOrderStats();
  renderWarehouseOrdersList();
}

function renderStockEntryProducts() {
  const select = document.getElementById('stockEntryProductSelect');
  const categorySelect = document.getElementById('stockEntryCategorySelect');
  if (!select || !categorySelect) return;

  const searchTerm = getInputValue('stockEntryProductSearchInput');
  const products = getVisibleProducts().filter(product => {
    return product.categoryId === categorySelect.value
      && matchesSearchTerm(searchTerm, [product.name, getCategoryName(product.categoryId)]);
  });

  select.innerHTML = products.length
    ? products.map(product => `<option value="${product.id}">${product.name}</option>`).join('')
    : '<option value="">لا توجد أدوية مطابقة</option>';

  updateWarehouseOrderProductDefaults();
}

function renderStockEntryDestinations() {
  const typeSelect = document.getElementById('stockEntryDestinationTypeSelect');
  const targetSelect = document.getElementById('stockEntryDestinationSelect');
  const targetField = document.getElementById('stockEntryDestinationField');
  const wholesaleCustomerField = document.getElementById('wholesaleCustomerField');
  const wholesalePhoneField = document.getElementById('wholesalePhoneField');
  if (!typeSelect || !targetSelect || !targetField) return;

  const label = targetField.querySelector('label');
  const isWholesale = typeSelect.value === 'wholesale';

  const options = isWholesale
    ? [
        { value: 'direct', label: 'عميل جملة مباشر' },
        { value: 'clinic', label: 'عيادة / مركز' },
        { value: 'hospital', label: 'مستشفى' },
        { value: 'distributor', label: 'موزع خارجي' },
      ]
    : mockData.branches.map(branch => ({
        value: branch.id,
        label: `فرع ${branch.branchNumber} - ${branch.name}`,
      }));

  targetSelect.innerHTML = options.map(option => `
    <option value="${option.value}">${option.label}</option>
  `).join('');

  if (label) {
    label.textContent = isWholesale ? 'قناة الجملة' : 'الفرع';
  }

  if (wholesaleCustomerField) {
    wholesaleCustomerField.classList.toggle('hidden', !isWholesale);
  }

  if (wholesalePhoneField) {
    wholesalePhoneField.classList.toggle('hidden', !isWholesale);
  }

  updateWarehouseOrderProductDefaults();
  renderCurrentWarehouseOrderMeta();
}

function updateWarehouseOrderProductDefaults() {
  const productSelect = document.getElementById('stockEntryProductSelect');
  const priceInput = document.getElementById('stockOrderPriceInput');
  const quantityInput = document.getElementById('stockOrderQuantityInput');
  const type = getCurrentWarehouseOrderType();
  if (!productSelect || !priceInput || !quantityInput) return;

  const product = getProductById(productSelect.value);
  if (!product) return;
  const contextKey = `${type}:${product.id}`;

  if (!quantityInput.value || parseFlexibleNumber(quantityInput.value, 0) < 1) {
    quantityInput.value = '1';
  }

  if (
    !priceInput.value
    || Number.isNaN(parseFlexibleNumber(priceInput.value, Number.NaN))
    || appState.lastWarehouseOrderProductContext !== contextKey
  ) {
    priceInput.value = getDefaultWarehouseOrderUnitPrice(product, type);
  }

  appState.lastWarehouseOrderProductContext = contextKey;
}

function getCurrentWarehouseOrderType() {
  const type = getInputValue('stockEntryDestinationTypeSelect');
  return type === 'wholesale' ? 'wholesale' : 'branch';
}

function getCurrentWarehouseOrderDestination() {
  const type = getCurrentWarehouseOrderType();
  const destinationSelect = document.getElementById('stockEntryDestinationSelect');
  const wholesaleCustomerInput = document.getElementById('stockOrderWholesaleCustomerInput');
  const wholesalePhoneInput = document.getElementById('stockOrderWholesalePhoneInput');

  if (type === 'wholesale') {
    const channelLabel = destinationSelect?.selectedOptions?.[0]?.textContent?.trim() || 'جملة خارجية';
    const customerName = wholesaleCustomerInput?.value?.trim() || '';

    return {
      type,
      destinationId: destinationSelect?.value || '',
      destinationName: customerName || channelLabel,
      wholesaleCustomerName: customerName,
      wholesalePhone: wholesalePhoneInput?.value?.trim() || '',
      channelLabel,
    };
  }

  return {
    type,
    destinationId: destinationSelect?.value || '',
    destinationName: destinationSelect?.selectedOptions?.[0]?.textContent?.trim() || '',
    wholesaleCustomerName: '',
    wholesalePhone: '',
    channelLabel: '',
  };
}

function renderCurrentWarehouseOrderMeta() {
  const destination = getCurrentWarehouseOrderDestination();
  setText('currentWarehouseOrderTypeValue', getWarehouseOrderTypeLabel(destination.type));
  setText('currentWarehouseOrderDestinationValue', destination.destinationName || '-');
}

function addCurrentWarehouseOrderItem() {
  const productSelect = document.getElementById('stockEntryProductSelect');
  const unitSelect = document.getElementById('stockOrderUnitSelect');
  const quantityInput = document.getElementById('stockOrderQuantityInput');
  const priceInput = document.getElementById('stockOrderPriceInput');
  const expiryDateInput = document.getElementById('stockOrderExpiryDateInput');
  if (!productSelect || !unitSelect || !quantityInput || !priceInput || !expiryDateInput) return;

  const product = getProductById(productSelect.value);
  const destination = getCurrentWarehouseOrderDestination();
  const quantity = Math.max(1, parseFlexibleNumber(quantityInput.value, 1));
  const unitPrice = parseFlexibleNumber(priceInput.value, Number.NaN);
  const unit = unitSelect.value || product?.baseUnit || 'علبة';
  const expiryDate = expiryDateInput.value || '';

  if (!product) {
    setStockOrderSaveMessage('اختر دواء صالحًا قبل الإضافة.', 'error');
    return;
  }

  if (!destination.destinationName) {
    setStockOrderSaveMessage(destination.type === 'branch'
      ? 'اختر الفرع المطلوب قبل إضافة الأصناف.'
      : 'أدخل اسم عميل الجملة أو اختر قناة الجملة أولًا.', 'error');
    return;
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    setStockOrderSaveMessage('أدخل سعر وحدة صحيحًا أكبر من صفر.', 'error');
    return;
  }

  const existingItem = appState.currentWarehouseOrderItems.find(item => {
    return item.productId === product.id
      && item.unit === unit
      && Number(item.unitPrice) === Number(unitPrice)
      && String(item.expiryDate || '') === expiryDate;
  });

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.lineTotal = existingItem.quantity * existingItem.unitPrice;
  } else {
    appState.currentWarehouseOrderItems.push({
      id: `order-line-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      unit,
      quantity,
      unitPrice,
      expiryDate,
      lineTotal: quantity * unitPrice,
    });
  }

  quantityInput.value = '1';
  expiryDateInput.value = '';
  setStockOrderSaveMessage('تمت إضافة الصنف إلى الطلبية الحالية.', 'success');
  renderCurrentWarehouseOrder();
}

function saveCurrentWarehouseOrder() {
  if (!appState.currentUser) return;

  if (!appState.currentWarehouseOrderItems.length) {
    setStockOrderSaveMessage('أضف صنفًا واحدًا على الأقل قبل حفظ الطلبية.', 'error');
    return;
  }

  const destination = getCurrentWarehouseOrderDestination();
  const priority = getInputValue('stockOrderPrioritySelect') || 'normal';
  const referenceNumber = getInputValue('stockOrderReferenceInput');
  const notes = getInputValue('stockOrderNotesInput');

  if (!destination.destinationName) {
    setStockOrderSaveMessage(destination.type === 'branch'
      ? 'اختر الفرع المطلوب قبل الحفظ.'
      : 'أدخل اسم عميل الجملة قبل الحفظ.', 'error');
    return;
  }

  const orderNumber = getNextWarehouseOrderNumber();
  const order = normalizeWarehouseOrderRecord({
    id: `order-${Date.now()}`,
    orderNumber,
    orderType: destination.type,
    destinationType: destination.type,
    destinationId: destination.destinationId,
    destinationName: destination.destinationName,
    wholesaleCustomerName: destination.wholesaleCustomerName,
    wholesalePhone: destination.wholesalePhone,
    priority,
    referenceNumber,
    notes,
    status: 'draft',
    createdAt: getNowDateTime(),
    createdBy: appState.currentUser.id,
    items: appState.currentWarehouseOrderItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      categoryId: item.categoryId,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      expiryDate: item.expiryDate,
      lineTotal: item.lineTotal,
    })),
    total: sumBy(appState.currentWarehouseOrderItems, 'lineTotal'),
  });

  mockData.stockEntries.unshift(order);
  normalizeWarehouseOrdersCollection();
  queueSyncOperation('warehouse_order_saved', {
    orderId: order.id,
    orderType: order.orderType,
  });

  clearCurrentWarehouseOrder({ preserveType: true, silent: true });
  renderWarehouseOrderStats();
  renderWarehouseOrdersList();
  setStockOrderSaveMessage(`تم حفظ الطلبية ${order.orderNumber} بنجاح.`, 'success');
}

function clearCurrentWarehouseOrder(options = {}) {
  appState.currentWarehouseOrderItems = [];
  appState.lastWarehouseOrderProductContext = '';

  setInputValue('stockEntryProductSearchInput', '');
  setInputValue('stockOrderQuantityInput', '1');
  setInputValue('stockOrderPriceInput', '');
  setInputValue('stockOrderExpiryDateInput', '');
  setInputValue('stockOrderReferenceInput', '');
  setInputValue('stockOrderNotesInput', '');
  setInputValue('stockOrderWholesaleCustomerInput', '');
  setInputValue('stockOrderWholesalePhoneInput', '');
  setInputValue('stockOrderPrioritySelect', 'normal');

  renderStockEntryProducts();
  renderStockEntryDestinations();
  renderCurrentWarehouseOrder();

  if (!options.silent) {
    setStockOrderSaveMessage('');
  }
}

function renderCurrentWarehouseOrder() {
  const tbody = document.getElementById('currentWarehouseOrderItemsBody');
  if (!tbody) return;

  if (!appState.currentWarehouseOrderItems.length) {
    tbody.innerHTML = '<tr><td colspan="7">لا توجد أصناف داخل الطلبية الحالية.</td></tr>';
    setText('currentWarehouseOrderItemsCount', '0');
    setText('currentWarehouseOrderTotalValue', formatCurrency(0));
    renderCurrentWarehouseOrderMeta();
    return;
  }

  tbody.innerHTML = appState.currentWarehouseOrderItems.map((item, index) => `
    <tr>
      <td>${item.productName}</td>
      <td>${item.unit}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.unitPrice)}</td>
      <td>${item.expiryDate || 'غير محدد'}</td>
      <td>${formatCurrency(item.lineTotal)}</td>
      <td><button class="btn btn-danger invoice-remove-btn" type="button" onclick="removeCurrentWarehouseOrderItem(${index})">حذف</button></td>
    </tr>
  `).join('');

  setText('currentWarehouseOrderItemsCount', String(appState.currentWarehouseOrderItems.length));
  setText('currentWarehouseOrderTotalValue', formatCurrency(sumBy(appState.currentWarehouseOrderItems, 'lineTotal')));
  renderCurrentWarehouseOrderMeta();
}

function removeCurrentWarehouseOrderItem(index) {
  appState.currentWarehouseOrderItems = appState.currentWarehouseOrderItems.filter((_, itemIndex) => itemIndex !== index);
  renderCurrentWarehouseOrder();
}

function renderWarehouseOrderStats() {
  const orders = getVisibleWarehouseOrders();
  setText('warehouseOrdersPendingCount', String(orders.filter(order => ['draft', 'processing'].includes(order.status)).length));
  setText('warehouseOrdersBranchCount', String(orders.filter(order => order.orderType === 'branch').length));
  setText('warehouseOrdersWholesaleCount', String(orders.filter(order => order.orderType === 'wholesale').length));
  setText('warehouseOrdersCompletedCount', String(orders.filter(order => order.status === 'completed').length));
}

function renderWarehouseOrdersList() {
  const container = document.getElementById('warehouseOrdersList');
  if (!container) return;

  const orders = getFilteredWarehouseOrders();
  if (!orders.length) {
    container.innerHTML = '<div class="list-card"><p class="page-note">لا توجد طلبيات مطابقة للبحث أو الفلتر الحالي.</p></div>';
    return;
  }

  container.innerHTML = orders.map(order => buildWarehouseOrderCardMarkup(order)).join('');
}

function getFilteredWarehouseOrders() {
  const searchTerm = getInputValue('stockOrdersSearchInput');
  const statusFilter = getInputValue('stockOrdersStatusFilter') || 'all';

  return getVisibleWarehouseOrders().filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const itemNames = (order.items || []).map(item => item.productName).join(' ');

    return matchesStatus && matchesSearchTerm(searchTerm, [
      order.orderNumber,
      order.destinationName,
      order.referenceNumber,
      itemNames,
      order.wholesalePhone,
    ]);
  });
}

function buildWarehouseOrderCardMarkup(order) {
  const nextStatusButton = order.status === 'draft'
    ? `<button class="btn btn-primary" type="button" onclick="updateWarehouseOrderStatus('${order.id}', 'processing')">بدء التجهيز</button>`
    : order.status === 'processing'
      ? `<button class="btn btn-success" type="button" onclick="updateWarehouseOrderStatus('${order.id}', 'completed')">تم التسليم</button>`
      : '';
  const itemsPreview = (order.items || [])
    .map(item => `${item.productName} (${item.quantity} ${item.unit})`)
    .join(' / ');

  return `
    <div class="list-card">
      <div class="branch-overview-header">
        <div>
          <h4>${order.orderNumber}</h4>
          <div class="list-meta">
            <span class="tag ${getWarehouseOrderTypeClass(order.orderType)}">${getWarehouseOrderTypeLabel(order.orderType)}</span>
            <span class="tag ${getWarehouseOrderStatusClass(order.status)}">${getWarehouseOrderStatusLabel(order.status)}</span>
            <span class="tag ${getWarehouseOrderPriorityClass(order.priority)}">${getWarehouseOrderPriorityLabel(order.priority)}</span>
            <span>${order.destinationName}</span>
            <span>${formatCurrency(order.total)}</span>
            <span>${order.createdAt}</span>
          </div>
        </div>
        <div class="table-actions">
          ${nextStatusButton}
        </div>
      </div>
      <p class="page-note">${itemsPreview || 'لا توجد أصناف'}</p>
      ${order.referenceNumber ? `<p class="page-note">المرجع: ${order.referenceNumber}</p>` : ''}
      ${order.notes ? `<p class="page-note">ملاحظات: ${order.notes}</p>` : ''}
    </div>
  `;
}

function updateWarehouseOrderStatus(orderId, nextStatus) {
  const orderIndex = mockData.stockEntries.findIndex(order => order.id === orderId);
  if (orderIndex === -1) return;

  const previousOrder = normalizeWarehouseOrderRecord(mockData.stockEntries[orderIndex]);
  const completedNow = previousOrder.status !== 'completed' && nextStatus === 'completed';

  mockData.stockEntries[orderIndex] = normalizeWarehouseOrderRecord({
    ...previousOrder,
    status: nextStatus,
  });

  if (completedNow && previousOrder.orderType === 'branch') {
    applyWarehouseOrderToBranchInventory(mockData.stockEntries[orderIndex]);
    createWarehouseOrderNotification(mockData.stockEntries[orderIndex]);
  }

  normalizeWarehouseOrdersCollection();
  queueSyncOperation('warehouse_order_status_updated', {
    orderId,
    status: nextStatus,
  });
  renderStockTable();
  renderProductsTable();
  renderWarehouseOrderStats();
  renderWarehouseOrdersList();
  renderShellHeader();
  renderGlobalNotificationBanner();
  renderNotificationsList();
}


function applyWarehouseOrderToBranchInventory(order) {
  if (order?.orderType !== 'branch' || !order?.destinationId) return;

  (order.items || []).forEach(item => {
    const sourceProduct = getProductById(item.productId);
    const existingBranchProduct = mockData.products.find(product => {
      return product.branchId === order.destinationId
        && normalizeSearchText(product.name) === normalizeSearchText(item.productName);
    });

    if (existingBranchProduct) {
      existingBranchProduct.stockQty = Math.max(0, parseFlexibleNumber(existingBranchProduct.stockQty, 0) + parseFlexibleNumber(item.quantity, 0));
      existingBranchProduct.salePrice = parseFlexibleNumber(existingBranchProduct.salePrice, sourceProduct?.salePrice ?? item.unitPrice);
      existingBranchProduct.wholesalePrice = parseFlexibleNumber(existingBranchProduct.wholesalePrice, sourceProduct?.wholesalePrice ?? sourceProduct?.salePrice ?? item.unitPrice);
      existingBranchProduct.purchasePrice = parseFlexibleNumber(existingBranchProduct.purchasePrice, sourceProduct?.purchasePrice ?? item.unitPrice);
      existingBranchProduct.expiryDate = item.expiryDate || existingBranchProduct.expiryDate || sourceProduct?.expiryDate || '';
      existingBranchProduct.notes = existingBranchProduct.notes || sourceProduct?.notes || '';
      return;
    }

    mockData.products.push(normalizeProductRecord({
      id: `product-${order.destinationId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: item.productName,
      categoryId: item.categoryId || sourceProduct?.categoryId || '',
      baseUnit: item.unit || sourceProduct?.baseUnit || 'علبة',
      purchasePrice: sourceProduct?.purchasePrice ?? item.unitPrice,
      wholesalePrice: sourceProduct?.wholesalePrice ?? sourceProduct?.salePrice ?? item.unitPrice,
      salePrice: sourceProduct?.salePrice ?? item.unitPrice,
      stockQty: item.quantity,
      lowStockThreshold: sourceProduct?.lowStockThreshold ?? 5,
      branchId: order.destinationId,
      supplierName: 'المخزن الرئيسي',
      expiryDate: item.expiryDate || sourceProduct?.expiryDate || '',
      notes: sourceProduct?.notes || '',
    }));
  });

  normalizeProductsCollection();
}

function createWarehouseOrderNotification(order) {
  if (order?.orderType !== 'branch' || !order?.destinationId) return;

  const branch = getBranchById(order.destinationId);
  const branchName = branch ? `فرع ${branch.branchNumber} - ${branch.name}` : 'الفرع';
  const itemCount = (order.items || []).length;
  const itemLabel = itemCount === 1 ? 'صنف واحد' : `${itemCount} أصناف`;

  mockData.notifications = mockData.notifications || [];
  mockData.notifications.unshift({
    id: `notify-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    branchId: order.destinationId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    title: `تمت إضافة مخزون جديد إلى ${branchName}`,
    message: `تم تسليم ${order.orderNumber} وإضافة ${itemLabel} إلى مخزون ${branchName}.`,
    createdAt: getNowDateTime(),
    readBy: [],
    itemsPreview: (order.items || []).slice(0, 4).map(item => `${item.productName} (${item.quantity} ${item.unit})`),
  });

  normalizeNotificationsCollection();
}

function getVisibleWarehouseOrders() {
  if (!appState.currentUser) return [];
  return getSortedWarehouseOrdersCollection();
}

function getSortedWarehouseOrdersCollection(orders = mockData.stockEntries) {
  return [...orders].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function getNextWarehouseOrderNumber() {
  const numbers = mockData.stockEntries.map(order => {
    const raw = String(order.orderNumber || '').replace(/[^\d]/g, '');
    return Number(raw || 0);
  });
  return `ORD-${(numbers.length ? Math.max(...numbers) : 2000) + 1}`;
}

function getWarehouseOrderTypeLabel(type) {
  return type === 'wholesale' ? 'طلبية جملة' : 'طلبية فرع';
}

function getWarehouseOrderTypeClass(type) {
  return type === 'wholesale' ? 'tag-partial' : 'tag-pending';
}

function getWarehouseOrderStatusLabel(status) {
  if (status === 'completed') return 'تم التسليم';
  if (status === 'processing') return 'جارٍ التجهيز';
  return 'قيد التحضير';
}

function getWarehouseOrderStatusClass(status) {
  if (status === 'completed') return 'tag-paid';
  if (status === 'processing') return 'tag-low';
  return 'tag-pending';
}

function getWarehouseOrderPriorityLabel(priority) {
  if (priority === 'urgent') return 'مستعجلة';
  if (priority === 'scheduled') return 'مجدولة';
  return 'عادية';
}

function getWarehouseOrderPriorityClass(priority) {
  if (priority === 'urgent') return 'tag-debt';
  if (priority === 'scheduled') return 'tag-partial';
  return 'tag-paid';
}

function renderSettings() {
  setInputValue('settingsPharmacyName', mockData.settings.pharmacyName);
  setInputValue('settingsCurrency', mockData.settings.currency);
  setInputValue('settingsLastSyncAt', mockData.settings.lastSyncAt || 'لم تتم بعد');
  setInputValue('settingsPendingOperations', String(mockData.settings.pendingOperations || 0));
}

function renderBranding() {
  const pharmacyName = pickCleanText(
    mockData.settings?.pharmacyName,
    pickCleanText(mockData.pharmacy?.name, 'نظام إدارة الصيدلية')
  );
  document.title = pharmacyName;

  document.querySelectorAll('[data-pharmacy-name]').forEach(el => {
    el.textContent = pharmacyName;
  });
}

function openInvoice(invoiceId) {
  appState.selectedInvoiceId = invoiceId;
  renderInvoiceDetails();
  showPage('invoicePage');
}

function openInvoiceFromDebt(debtId) {
  const debt = mockData.debts.find(item => item.id === debtId);
  if (!debt?.invoiceId) return;

  appState.invoiceReturnPage = 'debtsPage';
  openInvoice(debt.invoiceId);
}

function getSelectedInvoice() {
  const invoices = getVisibleInvoices({ includePending: true });
  return invoices.find(invoice => invoice.id === appState.selectedInvoiceId) || invoices[0] || null;
}

function getVisibleStats() {
  const today = getTodayDate();
  const invoices = getVisibleInvoices();
  const todayInvoices = invoices.filter(invoice => invoice.createdAt === today);
  const visibleDebts = getVisibleDebts();
  const todayDirectProfit = sumBy(
    todayInvoices.filter(invoice => invoice.paymentMethod !== 'debt'),
    'profit'
  );
  const todayDebtCollectionsProfit = visibleDebts.reduce(
    (sum, debt) => sum + getDebtTransferredProfitForDate(debt, today),
    0
  );

  return {
    todaySales: sumBy(todayInvoices, 'total'),
    todayProfit: todayDirectProfit + todayDebtCollectionsProfit,
    todayInvoices: todayInvoices.length,
    currentDebts: visibleDebts.reduce((sum, debt) => sum + getDebtRemainingAmount(debt), 0),
  };
}

function getSortedInvoicesCollection(invoices = mockData.salesInvoices) {
  return [...invoices].sort((a, b) => {
    const dateCompare = String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    if (dateCompare !== 0) return dateCompare;
    return Number(b.invoiceNumber || 0) - Number(a.invoiceNumber || 0);
  });
}

function getVisibleInvoices(options = {}) {
  const includePending = Boolean(options.includePending);
  if (!appState.currentUser) return [];

  let invoices = getSortedInvoicesCollection();
  if (!includePending) {
    invoices = invoices.filter(isInvoiceReady);
  }

  if (appState.currentUser.role === 'manager') return invoices;
  if (appState.currentUser.role === 'stock' && !appState.currentUser.branchId) return invoices;
  if (!appState.currentUser.branchId) return invoices;

  return invoices.filter(invoice => invoice.branchId === appState.currentUser.branchId);
}

function getPendingVerificationInvoices() {
  return getVisibleInvoices({ includePending: true }).filter(invoice => {
    return invoice.paymentMethod === 'transfer' && invoice.verificationStatus === 'pending';
  });
}

function isInvoiceReady(invoice) {
  return !(invoice.paymentMethod === 'transfer' && invoice.verificationStatus === 'pending');
}

function getNextInvoiceNumber() {
  const numbers = mockData.salesInvoices.map(invoice => Number(invoice.invoiceNumber) || 0);
  return (numbers.length ? Math.max(...numbers) : 1000) + 1;
}

function resolveCurrentSaleBranchId() {
  if (appState.currentUser?.role === 'manager') {
    return appState.managerSaleScopeType === 'branch' ? appState.managerSaleBranchId : null;
  }

  return appState.currentUser?.branchId || null;
}

function updateInvoicesPageTitle() {
  const title = document.getElementById('myInvoicesPageTitle');
  if (!title || !appState.currentUser) return;

  if (appState.currentUser.role === 'manager') {
    title.textContent = 'كل الفواتير الجاهزة حسب الفروع والبائعين';
    return;
  }

  title.textContent = 'فواتير الفرع';
}

function getEmptyInvoicesMessage() {
  if (!appState.currentUser) return 'لا توجد فواتير متاحة.';
  if (appState.currentUser.role === 'manager') return 'لا توجد فواتير جاهزة مطابقة للبحث حاليًا.';
  return 'لا توجد فواتير جاهزة لهذا الفرع.';
}

function getVisibleDebts() {
  if (!appState.currentUser) return [];
  normalizeDebtsCollection();
  if (appState.currentUser.role === 'manager') return mockData.debts;
  if (appState.currentUser.role === 'stock' && !appState.currentUser.branchId) return mockData.debts;
  return mockData.debts.filter(debt => debt.branchId === appState.currentUser.branchId);
}

function getDebtOriginalAmount(debt) {
  return normalizeDebtRecord(debt).originalAmount;
}

function getDebtPaidAmount(debt) {
  return normalizeDebtRecord(debt).paidAmount;
}

function getDebtRemainingAmount(debt) {
  return normalizeDebtRecord(debt).remainingAmount;
}

function getDebtLinkedInvoice(debt) {
  return getInvoiceById(normalizeDebtRecord(debt).invoiceId);
}

function calculateDebtProfitFromAmount(debt, amount) {
  const normalizedDebt = normalizeDebtRecord(debt);
  const linkedInvoice = getDebtLinkedInvoice(normalizedDebt);
  const originalAmount = normalizedDebt.originalAmount;
  const profitRatio = originalAmount > 0 ? Number(linkedInvoice?.profit || 0) / originalAmount : 0;

  return profitRatio * Number(amount || 0);
}

function getDebtTransferredProfit(debt) {
  return calculateDebtProfitFromAmount(debt, getDebtPaidAmount(debt));
}

function getDebtTransferredProfitForDate(debt, date) {
  const normalizedDebt = normalizeDebtRecord(debt);
  const paymentHistory = Array.isArray(normalizedDebt.paymentHistory) ? normalizedDebt.paymentHistory : [];

  return paymentHistory.reduce((sum, payment) => {
    if (String(payment?.paidAt || '') !== String(date || '')) return sum;
    return sum + calculateDebtProfitFromAmount(normalizedDebt, payment.amount);
  }, 0);
}

function getInvoiceRealizedProfit(invoice) {
  if (!invoice) return 0;
  if (invoice.paymentMethod === 'transfer' && invoice.verificationStatus === 'pending') return 0;
  if (invoice.paymentMethod !== 'debt') return Number(invoice.profit || 0);

  const relatedDebt = mockData.debts.find(debt => debt.invoiceId === invoice.id);
  return relatedDebt ? getDebtTransferredProfit(relatedDebt) : 0;
}

function sumInvoicesRealizedProfit(invoices) {
  return (invoices || []).reduce((sum, invoice) => sum + getInvoiceRealizedProfit(invoice), 0);
}

function getDebtStatusLabel(debt) {
  const normalizedDebt = normalizeDebtRecord(debt);

  if (normalizedDebt.status === 'paid') return 'تم السداد';
  if (normalizedDebt.status === 'partial') return 'سداد جزئي';
  return 'دين';
}

function getDebtStatusClass(debt) {
  const normalizedDebt = normalizeDebtRecord(debt);

  if (normalizedDebt.status === 'paid') return 'tag-paid';
  if (normalizedDebt.status === 'partial') return 'tag-partial';
  return 'tag-debt';
}

function getDebtActionLabel(debt) {
  const normalizedDebt = normalizeDebtRecord(debt);
  if (normalizedDebt.remainingAmount <= 0) return 'تم';
  if (normalizedDebt.paidAmount > 0) return 'سداد الباقي';
  return 'سداد جزء';
}

function getDebtActionClass(debt) {
  return getDebtRemainingAmount(debt) > 0 ? 'btn-warning' : 'btn-light';
}

function recordDebtPayment(debtId) {
  const debtIndex = mockData.debts.findIndex(debt => debt.id === debtId);
  if (debtIndex === -1) return;

  const debt = normalizeDebtRecord(mockData.debts[debtIndex]);
  if (debt.remainingAmount <= 0) {
    window.alert('هذا الدين مسدد بالكامل بالفعل.');
    return;
  }

  const enteredAmount = window.prompt(
    `أدخل قيمة الدفعة. المتبقي الحالي على الزبون هو ${formatCurrency(debt.remainingAmount)}.`,
    String(debt.remainingAmount)
  );

  if (enteredAmount === null) return;

  const paymentAmount = parseFlexibleNumber(enteredAmount, Number.NaN);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    window.alert('أدخل مبلغًا صحيحًا أكبر من صفر.');
    return;
  }

  if (paymentAmount > debt.remainingAmount) {
    window.alert('لا يمكن أن تكون الدفعة أكبر من المبلغ المتبقي.');
    return;
  }

  const paidAmount = debt.paidAmount + paymentAmount;
  const remainingAmount = Math.max(debt.originalAmount - paidAmount, 0);
  const status = remainingAmount <= 0 ? 'paid' : 'partial';

  mockData.debts[debtIndex] = normalizeDebtRecord({
    ...debt,
    paidAmount,
    remainingAmount,
    status,
    lastPaymentAt: getTodayDate(),
    paymentHistory: [
      ...(Array.isArray(debt.paymentHistory) ? debt.paymentHistory : []),
      {
        amount: paymentAmount,
        paidAt: getTodayDate(),
      },
    ],
  });

  normalizeDebtsCollection();
  queueSyncOperation('debt_payment', {
    debtId,
    amount: paymentAmount,
  });

  renderDebtsTable();
  renderDashboardStats();
  renderInvoicesList();
  renderInvoiceDetails();
  renderBranchesTable();

  window.alert(
    remainingAmount > 0
      ? `تم تسجيل الدفعة بنجاح. المتبقي على الزبون هو ${formatCurrency(remainingAmount)}.`
      : 'تم سداد الدين بالكامل بنجاح.'
  );
}

function getVisibleProducts() {
  if (!appState.currentUser) return [];
  if (appState.currentUser.role === 'manager') return mockData.products;
  if (appState.currentUser.role === 'stock' && !appState.currentUser.branchId) return mockData.products;
  return mockData.products.filter(product => product.branchId === appState.currentUser.branchId);
}

function getVisibleSaleProducts() {
  if (!appState.currentUser) return [];

  if (appState.currentUser.role === 'manager') {
    if (appState.managerSaleScopeType === 'branch') {
      return mockData.products.filter(product => product.branchId === appState.managerSaleBranchId);
    }

    return mockData.products;
  }

  return getVisibleProducts();
}

function getUserScopeLabel(user, format = 'default') {
  if (!user) return '-';

  if (user.role === 'manager') {
    return 'جميع الفروع';
  }

  if (user.role === 'stock' && !user.branchId) {
    if (format === 'session') return 'مخزن مركزي';
    if (format === 'login') return 'توريد للفروع والجملة';
    return 'مخزن مركزي (الفروع والجملة)';
  }

  const branch = getBranchById(user.branchId);
  if (!branch) return '-';

  if (format === 'login') {
    return `فرع ${branch.branchNumber || '-'} - ${branch.name || '-'}`;
  }

  if (format === 'session') {
    return branch.name || '-';
  }

  return `${branch.name || '-'} (${branch.branchNumber || '-'})`;
}

function getInvoiceDisplayMeta(invoice) {
  if (!invoice) {
    return {
      label: '-',
      className: 'tag-low',
      note: '',
    };
  }

  if (invoice.paymentMethod === 'transfer') {
    if (invoice.verificationStatus === 'pending') {
      return {
        label: 'بانتظار التحقق',
        className: 'tag-pending',
        note: 'هذه الفاتورة محفوظة كحوالة وتنتظر تأكيد وصول المبلغ.',
      };
    }

    return {
      label: 'حوالة مؤكدة',
      className: 'tag-paid',
      note: invoice.confirmedAt
        ? `تم اعتماد هذه الحوالة في ${invoice.confirmedAt}.`
        : 'تم اعتماد الحوالة وأصبحت الفاتورة جاهزة.',
    };
  }

  if (invoice.paymentMethod === 'debt') {
    const relatedDebt = mockData.debts.find(debt => debt.invoiceId === invoice.id);
    if (!relatedDebt) {
      return {
        label: 'دين',
        className: 'tag-debt',
        note: 'هذه الفاتورة محفوظة كدين.',
      };
    }

    const remainingAmount = getDebtRemainingAmount(relatedDebt);
    const paidAmount = getDebtPaidAmount(relatedDebt);

    if (remainingAmount <= 0) {
      return {
        label: 'دين مسدد',
        className: 'tag-paid',
        note: 'تم سداد هذه الفاتورة بالكامل.',
      };
    }

    if (paidAmount > 0) {
      return {
        label: 'دين جزئي',
        className: 'tag-partial',
        note: `تم سداد جزء من الدين وما زال متبقي ${formatCurrency(remainingAmount)}.`,
      };
    }

    return {
      label: 'دين',
      className: 'tag-debt',
      note: `المبلغ المتبقي على الزبون هو ${formatCurrency(remainingAmount)}.`,
    };
  }

  return {
    label: 'نقدي',
    className: 'tag-paid',
    note: 'هذه الفاتورة جاهزة ومدفوعة نقدًا.',
  };
}

function getPaymentMethodLabel(paymentMethod) {
  if (paymentMethod === 'debt') return 'دين';
  if (paymentMethod === 'transfer') return 'حوالة / تحويل';
  return 'نقدي';
}

function getInvoiceCustomerName(invoice) {
  if (!invoice) return '';
  if (invoice.customerName) return invoice.customerName;

  const relatedDebt = mockData.debts.find(debt => debt.invoiceId === invoice.id);
  return relatedDebt?.customerName || '';
}

function getInvoiceCustomerPhone(invoice) {
  if (!invoice) return '';
  if (invoice.customerPhone) return invoice.customerPhone;

  const relatedDebt = mockData.debts.find(debt => debt.invoiceId === invoice.id);
  return relatedDebt?.phone || '';
}

function getBranchById(branchId) {
  return mockData.branches.find(branch => branch.id === branchId) || null;
}

function getUserById(userId) {
  return mockData.users.find(user => user.id === userId) || null;
}

function getProductById(productId) {
  return mockData.products.find(product => product.id === productId) || null;
}

function getInvoiceById(invoiceId) {
  return mockData.salesInvoices.find(invoice => invoice.id === invoiceId) || null;
}

function getCategoryName(categoryId) {
  return mockData.categories.find(category => category.id === categoryId)?.name || '-';
}

function getTodayDate() {
  return mockData.pharmacy?.todayDate
    || mockData.settings?.todayDate
    || formatLocalDate(new Date());
}

function getNowDateTime() {
  const now = new Date();
  const date = formatLocalDate(now);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${date} ${hours}:${minutes}`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  const numericValue = Number(value || 0);
  const formatted = Number.isInteger(numericValue)
    ? numericValue.toString()
    : numericValue.toFixed(2).replace(/\.00$/, '');
  const currency = pickCleanText(
    mockData.settings?.currency,
    pickCleanText(mockData.pharmacy?.currency, '₪')
  );
  return `${currency} ${formatted}`;
}

function isPlaceholderText(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && /^[?؟\s._\-()[\]/\\]+$/.test(text);
}

function looksLikeBrokenEncoding(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  if (/[�]/.test(text)) return true;

  const suspiciousChars = ['Ø', 'Ù', 'Ã', 'Â', 'â', 'ð'];
  const suspiciousCount = suspiciousChars.reduce((sum, char) => {
    return sum + (text.split(char).length - 1);
  }, 0);

  return suspiciousCount >= Math.max(2, Math.ceil(text.length * 0.2));
}

function pickCleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  if (!text || isPlaceholderText(text) || looksLikeBrokenEncoding(text)) {
    return fallback;
  }
  return text;
}

function sanitizeSettingsRecord(candidateSettings = {}, baseSettings = mockData.settings) {
  const pharmacyNameFallback = pickCleanText(
    baseSettings?.pharmacyName,
    pickCleanText(mockData.pharmacy?.name, 'نظام إدارة الصيدلية')
  );
  const currencyFallback = pickCleanText(
    baseSettings?.currency,
    pickCleanText(mockData.pharmacy?.currency, '₪')
  );
  const todayDateFallback = pickCleanText(
    baseSettings?.todayDate,
    pickCleanText(mockData.pharmacy?.todayDate, '')
  );
  const lastSyncFallback = pickCleanText(
    baseSettings?.lastSyncAt,
    pickCleanText(mockData.pharmacy?.lastSyncAt, '')
  );
  const pendingOperations = Number(candidateSettings?.pendingOperations);

  return {
    ...baseSettings,
    ...candidateSettings,
    pharmacyName: pickCleanText(candidateSettings?.pharmacyName, pharmacyNameFallback),
    currency: pickCleanText(candidateSettings?.currency, currencyFallback),
    todayDate: pickCleanText(candidateSettings?.todayDate, todayDateFallback),
    lastSyncAt: pickCleanText(candidateSettings?.lastSyncAt, lastSyncFallback),
    pendingOperations: Number.isFinite(pendingOperations)
      ? pendingOperations
      : Number(baseSettings?.pendingOperations || 0),
  };
}

function parseFlexibleNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;

  const normalized = String(value)
    .trim()
    .replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
    .replace(/,/g, '.')
    .replace(/[^\d.\-]/g, '');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sumBy(items, key) {
  return (items || []).reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
}

function getInputValue(id) {
  const element = document.getElementById(id);
  if (!element) return '';
  return String(element.value || '').trim();
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
}

function matchesSearchTerm(searchTerm, values) {
  const normalizedSearch = normalizeSearchText(searchTerm);
  if (!normalizedSearch) return true;

  return (values || []).some(value => normalizeSearchText(value).includes(normalizedSearch));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function setSaleSaveMessage(message, type = '') {
  const element = document.getElementById('saleSaveMessage');
  if (!element) return;

  element.textContent = message;
  element.classList.toggle('hidden', !message);
  element.classList.remove('page-note-success', 'page-note-error');

  if (type === 'success') {
    element.classList.add('page-note-success');
  }

  if (type === 'error') {
    element.classList.add('page-note-error');
  }
}

function setStockOrderSaveMessage(message, type = '') {
  const element = document.getElementById('stockOrderSaveMessage');
  if (!element) return;

  element.textContent = message;
  element.classList.toggle('hidden', !message);
  element.classList.remove('page-note-success', 'page-note-error');

  if (type === 'success') {
    element.classList.add('page-note-success');
  }

  if (type === 'error') {
    element.classList.add('page-note-error');
  }
}

window.showPage = showPage;
window.getHomePage = getHomePage;
window.goBackFromInvoicePage = goBackFromInvoicePage;
window.loginAsUser = loginAsUser;
window.logout = logout;
window.openInvoice = openInvoice;
window.openInvoiceFromDebt = openInvoiceFromDebt;
window.markNotificationRead = markNotificationRead;
window.markAllVisibleNotificationsRead = markAllVisibleNotificationsRead;
window.addCurrentSaleItem = addCurrentSaleItem;
window.saveCurrentSaleInvoice = saveCurrentSaleInvoice;
window.removeCurrentSaleItem = removeCurrentSaleItem;
window.clearCurrentSaleInvoice = clearCurrentSaleInvoice;
window.addCurrentWarehouseOrderItem = addCurrentWarehouseOrderItem;
window.saveCurrentWarehouseOrder = saveCurrentWarehouseOrder;
window.clearCurrentWarehouseOrder = clearCurrentWarehouseOrder;
window.removeCurrentWarehouseOrderItem = removeCurrentWarehouseOrderItem;
window.updateWarehouseOrderStatus = updateWarehouseOrderStatus;
window.recordDebtPayment = recordDebtPayment;
window.confirmTransferInvoice = confirmTransferInvoice;
window.syncNow = syncNow;
