// ==============================================================================
// HZSITD Official Paperless Letter Portal — Client Application Engine
// Handles: Role Switching, Live Workflows (Scenarios A & B), Digital Signatures,
// Stamps, Letterhead Preview, Audit Timeline, and Letter Tracking.
// ==============================================================================

(function () {
  'use strict';

  // Global Portal State
  const state = {
    currentUser: null,
    directories: [],
    users: [],
    activeTab: 'inbox',
    activeLetterId: null,
    activeLetter: null,
    attachedFiles: [],
    signaturePad: null,
    signatureMode: 'PROFILE'
  };

  // Base API URL
  const API_BASE = '/api';

  // ============================================================================
  // 1. INITIALIZATION & LIFECYCLE
  // ============================================================================

  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏛️ Initializing HZSITD Paperless Letter Portal Client Engine...');

    try {
      // 1. Load active user session
      await fetchCurrentUser();

      // 2. Load directories & users
      await Promise.all([fetchDirectories(), fetchUsers()]);

      // 3. Setup Tallie Sidebar (collapse, profile, directories, nav)
      setupTallieSidebar();

      // 4. Setup Tallie Topbar (search, Ctrl+K shortcut)
      setupTallieTopbar();

      // 5. Setup Compose Form & Signature Pad
      setupComposeForm();
      setupSignaturePad();

      // 6. Initial Data Load — Render Bespoke Dashboard for Active Role
      await renderRoleDashboard();

      // 7. Update sidebar badges from stats API
      await updateSidebarBadges();

      // 8. Update sidebar profile card
      updateSidebarProfile();

      console.log('✅ HZSITD Portal Engine fully active.');
    } catch (err) {
      console.error('Initialization error:', err);
    }
  });

  // ============================================================================
  // 2. DATA FETCHING HELPERS
  // ============================================================================

  async function loadDashboardStats() {
    await renderRoleDashboard();
  }

  async function fetchCurrentUser() {
    const res = await fetch(`${API_BASE}/auth/current-user`);
    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = data.user;
    }
  }

  async function fetchDirectories() {
    const res = await fetch(`${API_BASE}/directories`);
    const data = await res.json();
    if (data.success) {
      state.directories = data.directories || [];
      populateDirectoryDropdowns();
    }
  }

  async function fetchUsers() {
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();
    if (data.success) {
      state.users = data.users || [];
    }
  }

  // ============================================================================
  // 3. TALLIE SIDEBAR PROFILE UPDATE & NAVIGATION CONTROLLER
  // ============================================================================

  function updateSidebarProfile() {
    const u = state.currentUser || { full_name: 'Staff', role: 'Officer' };

    // Update sidebar footer profile card
    const avatar = document.getElementById('sidebarUserAvatar');
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');

    if (avatar) avatar.textContent = (u.full_name || 'S').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = u.full_name || 'Staff';
    if (roleEl) roleEl.textContent = u.role || 'Officer';

    // Update topbar breadcrumb with role-specific label
    const breadcrumb = document.getElementById('topbarBreadcrumb');
    if (breadcrumb) {
      const roleLabels = {
        'Department Head': 'Executive Command Center',
        'Directory Lead': 'Directory Operations Hub',
        'Officer': 'Officer Operational Workbench',
        'System Admin': 'System Governance & IT Cockpit'
      };
      breadcrumb.textContent = roleLabels[u.role] || 'Dashboard';
    }

    // Highlight active persona in role switcher dropdown
    const options = document.querySelectorAll('#roleSwitcherDropdown .tallie-role-option');
    options.forEach(opt => {
      const onclick = opt.getAttribute('onclick') || '';
      const isActive = onclick.includes(`'${u.username}'`);
      opt.classList.toggle('active', isActive);
    });
  }

  function populateSidebarDirectories() {
    const container = document.getElementById('sidebarDirectoriesList');
    if (!container || state.directories.length === 0) return;

    container.innerHTML = state.directories.map(d => `
      <a class="tallie-nav-item" data-nav="directory" data-dir-id="${d.id}" title="${escapeHtml(d.name)}">
        <span class="tallie-nav-item-icon">
          <img src="../assets/animated icons/wired-outline-120-folder-in-reveal.webp" class="tallie-anim-icon tallie-anim-icon-nav" alt="Dir" />
        </span>
        <span class="tallie-nav-item-text">${escapeHtml(d.code)}</span>
      </a>
    `).join('');

    // Bind click events to directory nav items
    container.querySelectorAll('.tallie-nav-item[data-dir-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const dirId = parseInt(item.dataset.dirId);
        switchNav('directory', dirId);
      });
    });
  }

  async function updateSidebarBadges() {
    try {
      const [statsRes, allRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/letters?tab=all`)
      ]);
      const statsData = await statsRes.json();
      const allData = await allRes.json();
      const stats = statsData.stats || {};
      const allLetters = allData.letters || [];
      const u = state.currentUser;

      // Count letters for each sidebar category
      const inboxCount = allLetters.filter(l => l.direction === 'INCOMING').length;
      const sentCount = allLetters.filter(l => l.direction === 'OUTGOING' && l.status !== 'Draft').length;
      const draftCount = allLetters.filter(l => l.status === 'Draft').length;
      const archivedCount = allLetters.filter(l => l.status === 'Dispatched' || l.status === 'Completed').length;

      const endorsementCount = u && u.role === 'Department Head'
        ? allLetters.filter(l => l.approval_stage === 'Department Head Endorsement').length
        : 0;
      const clearanceCount = u && u.role === 'Directory Lead'
        ? allLetters.filter(l => l.approval_stage === 'Directory Lead Review' && l.sender_directory_id === u.directory_id).length
        : 0;
      const directiveCount = u
        ? allLetters.filter(l => l.assigned_officer_id === u.id && l.status === 'Under Review').length
        : 0;

      // Update badge elements
      const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = count;
          el.style.display = count > 0 ? '' : 'none';
        }
      };

      setBadge('sidebarBadgeInbox', inboxCount);
      setBadge('sidebarBadgeSent', sentCount);
      setBadge('sidebarBadgeDrafts', draftCount);
      setBadge('sidebarBadgeArchived', archivedCount);
      setBadge('sidebarBadgeEndorsements', endorsementCount);
      setBadge('sidebarBadgeClearance', clearanceCount);
      setBadge('sidebarBadgeDirectives', directiveCount);
    } catch (err) {
      console.error('Error updating sidebar badges:', err);
    }
  }

  // Sidebar Navigation: switch active view
  function switchNav(navKey, dirId) {
    // Remove active class from all nav items
    document.querySelectorAll('.tallie-nav-item').forEach(item => item.classList.remove('active'));

    // Set active on clicked item
    if (navKey === 'directory' && dirId) {
      const dirItem = document.querySelector(`.tallie-nav-item[data-dir-id="${dirId}"]`);
      if (dirItem) dirItem.classList.add('active');
    } else {
      const navItem = document.getElementById(`nav-${navKey}`);
      if (navItem) navItem.classList.add('active');
    }

    // Update state
    state.activeTab = navKey === 'dashboard' ? 'inbox' : navKey;

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbarBreadcrumb');
    if (breadcrumb) {
      if (navKey === 'dashboard') {
        const roleLabels = {
          'Department Head': 'Executive Command Center',
          'Directory Lead': 'Directory Operations Hub',
          'Officer': 'Officer Operational Workbench',
          'System Admin': 'System Governance & IT Cockpit'
        };
        breadcrumb.textContent = roleLabels[state.currentUser?.role] || 'Dashboard';
      } else if (navKey === 'directory' && dirId) {
        const dir = state.directories.find(d => d.id === dirId);
        breadcrumb.textContent = dir ? dir.name : 'Directory';
      } else {
        const labels = {
          inbox: 'Inbox Directives',
          sent: 'Sent & Dispatched',
          drafts: 'Drafts',
          archived: 'Archived Records',
          endorsements: 'Executive Endorsements',
          clearance: 'Supervisor Review',
          directives: 'Assigned Directives'
        };
        breadcrumb.textContent = labels[navKey] || navKey;
      }
    }

    // Render appropriate view
    if (navKey === 'dashboard') {
      renderRoleDashboard();
    } else {
      renderFilteredLettersView(navKey, dirId);
    }
  }

  // Render a filtered letters table for a specific sidebar nav category
  async function renderFilteredLettersView(navKey, dirId) {
    const mount = document.getElementById('dashboardRoleMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="text-center py-10">
        <div class="spinner-border text-dark" role="status"></div>
        <p class="text-muted mt-3 fs-4">Loading correspondence...</p>
      </div>
    `;

    try {
      const res = await fetch(`${API_BASE}/letters?tab=all`);
      const data = await res.json();
      const allLetters = data.letters || [];
      const u = state.currentUser;

      let filtered = allLetters;
      let sectionTitle = 'Correspondence';
      let sectionDesc = '';

      if (navKey === 'inbox') {
        filtered = allLetters.filter(l => l.direction === 'INCOMING');
        sectionTitle = 'Inbox — Incoming Directives & Correspondence';
        sectionDesc = 'All inbound letters from external ministries, federal organs, and regional government.';
      } else if (navKey === 'sent') {
        filtered = allLetters.filter(l => l.direction === 'OUTGOING' && l.status !== 'Draft');
        sectionTitle = 'Sent & Dispatched Letters';
        sectionDesc = 'All outgoing correspondence submitted, endorsed, or dispatched.';
      } else if (navKey === 'drafts') {
        filtered = allLetters.filter(l => l.status === 'Draft');
        sectionTitle = 'Draft Letters';
        sectionDesc = 'Unpublished drafts awaiting completion and submission.';
      } else if (navKey === 'archived') {
        filtered = allLetters.filter(l => l.status === 'Dispatched' || l.status === 'Completed');
        sectionTitle = 'Archived & Completed Records';
        sectionDesc = 'Fully endorsed, sealed, and dispatched official records.';
      } else if (navKey === 'endorsements') {
        filtered = allLetters.filter(l => l.approval_stage === 'Department Head Endorsement');
        sectionTitle = 'Executive Endorsement Queue';
        sectionDesc = 'Letters awaiting final Department Head signature and legal seal.';
      } else if (navKey === 'clearance') {
        filtered = allLetters.filter(l => l.approval_stage === 'Directory Lead Review' && u && l.sender_directory_id === u.directory_id);
        sectionTitle = 'Supervisor Review Queue';
        sectionDesc = 'Officer drafts awaiting your supervisory clearance.';
      } else if (navKey === 'directives') {
        filtered = allLetters.filter(l => u && l.assigned_officer_id === u.id);
        sectionTitle = 'Assigned Directives';
        sectionDesc = 'Tasks and directives assigned to you by your supervisor.';
      } else if (navKey === 'directory' && dirId) {
        const dir = state.directories.find(d => d.id === dirId);
        filtered = allLetters.filter(l => l.sender_directory_id === dirId || l.recipient_directory_id === dirId);
        sectionTitle = dir ? `${dir.name} — Correspondence` : 'Directory Correspondence';
        sectionDesc = dir ? `All letters involving the ${dir.name} directory.` : '';
      }

      mount.innerHTML = `
        <div class="tallie-dashboard">
          <section class="tallie-section">
            <div class="tallie-section-header">
              <div class="tallie-section-title-wrap">
                <h2 class="tallie-section-title">
                  <span>${escapeHtml(sectionTitle)}</span>
                  <span class="tallie-source-badge tallie-source-oracle">${filtered.length} Letters</span>
                </h2>
                <p class="tallie-section-desc">${escapeHtml(sectionDesc)}</p>
              </div>
              <div class="d-flex gap-2">
                <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.exportCurrentLettersCsv()">
                  <img src="../assets/animated icons/wired-outline-3379-arrows-down-in-reveal.webp" class="tallie-anim-icon tallie-anim-icon-btn" alt="Export" />
                  <span>Export CSV</span>
                </button>
                <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.openComposeModal()">
                  <img src="../assets/animated icons/wired-outline-245-file-pencil-in-reveal.webp" class="tallie-anim-icon tallie-anim-icon-btn" alt="New Letter" />
                  <span>New Letter</span>
                </button>
              </div>
            </div>

            <div class="tallie-table-container">
              ${filtered.length === 0 ? `
                <div class="tallie-empty-state">
                  <img src="../assets/animated icons/wired-outline-120-folder-in-reveal.webp" class="tallie-anim-icon tallie-anim-icon-hero" alt="Empty" />
                  <h4 class="tallie-empty-title">No letters found</h4>
                  <p class="tallie-empty-desc">There are no correspondence records matching this filter.</p>
                </div>
              ` : `
                <div style="overflow-x: auto;">
                  <table class="tallie-table" id="filteredLettersTable">
                    <thead>
                      <tr>
                        <th style="min-width: 130px;">Status</th>
                        <th style="min-width: 150px;">Reference ID</th>
                        <th style="min-width: 80px;">Direction</th>
                        <th style="min-width: 180px;">From / To</th>
                        <th style="min-width: 260px;">Subject</th>
                        <th style="min-width: 100px;">Priority</th>
                        <th style="min-width: 140px; text-align: right;">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filtered.map(l => `
                        <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                          <td>${renderTallieStatusPill(l.status)}</td>
                          <td>
                            <div class="d-flex flex-column gap-1">
                              <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                              <small class="text-muted">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Recent')}</small>
                            </div>
                          </td>
                          <td>
                            <span class="tallie-source-badge ${l.direction === 'INCOMING' ? 'tallie-source-oracle' : 'tallie-source-emerald'}">${l.direction === 'INCOMING' ? 'IN' : 'OUT'}</span>
                          </td>
                          <td>
                            <span style="font-weight: 500;" class="text-truncate d-block" style="max-width: 180px;">
                              ${l.direction === 'INCOMING' ? escapeHtml(l.external_sender_org || l.external_sender_name || 'External') : escapeHtml(l.sender_name || 'Staff')}
                            </span>
                          </td>
                          <td>
                            <span style="font-weight: 500; max-width: 300px;" class="text-truncate d-block" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                          </td>
                          <td>${renderTalliePriorityBadge(l.priority)}</td>
                          <td style="text-align: right;" onclick="event.stopPropagation()">
                            <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openLetterModal(${l.id})">
                              Inspect
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </section>
        </div>
      `;
    } catch (err) {
      console.error('Error rendering filtered view:', err);
      mount.innerHTML = `<div class="alert alert-danger p-4 text-center">Failed to load letters.</div>`;
    }
  }

  // Switch Active User Persona
  async function switchUser(username) {
    try {
      const res = await fetch(`${API_BASE}/auth/switch-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.success) {
        state.currentUser = data.user;
        updateSidebarProfile();
        const roleSwitcher = document.getElementById('roleSwitcherDropdown');
        if (roleSwitcher) {
          roleSwitcher.classList.remove('show');
          roleSwitcher.classList.remove('open');
        }
        populateComposeFormUserFields();
        await renderRoleDashboard();
        await updateSidebarBadges();
        // Reset nav to dashboard
        switchNav('dashboard');
        showToast(`Switched active session to: ${data.user.full_name} (${data.user.role})`);
      }
    } catch (err) {
      console.error('Error switching user:', err);
    }
  }

  // ============================================================================
  // 4. ROLE-SPECIFIC BESPOKE DASHBOARD SYSTEM (LEVELS 1, 2, 3 & 4)
  // ============================================================================

  async function renderRoleDashboard() {
    const mount = document.getElementById('dashboardRoleMount');
    if (!mount) return;

    mount.innerHTML = `
      <div class="text-center py-10">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-3 fs-4">Loading customized dashboard for ${state.currentUser?.full_name || 'Staff'}...</p>
      </div>
    `;

    try {
      const [statsRes, lettersRes, allRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/letters?tab=${state.activeTab}`),
        fetch(`${API_BASE}/letters?tab=all`)
      ]);

      const statsData = await statsRes.json();
      const lettersData = await lettersRes.json();
      const allData = await allRes.json();

      const stats = statsData.stats || {};
      const tabLetters = lettersData.letters || [];
      const allLetters = allData.letters || [];
      const role = state.currentUser ? state.currentUser.role : 'Officer';

      if (role === 'Department Head') {
        renderDepartmentHeadDashboard(mount, stats, tabLetters, allLetters);
      } else if (role === 'Directory Lead') {
        renderDirectoryLeadDashboard(mount, stats, tabLetters, allLetters);
      } else if (role === 'Officer') {
        renderOfficerDashboard(mount, stats, tabLetters, allLetters);
      } else if (role === 'System Admin') {
        renderSystemAdminDashboard(mount, stats, tabLetters, allLetters);
      }
    } catch (err) {
      console.error('Error rendering role dashboard:', err);
      mount.innerHTML = `<div class="alert alert-danger p-4 text-center">Failed to load dashboard. Please refresh.</div>`;
    }
  }

  // ============================================================================
  // 4. TALLIE-INSPIRED ROLE DASHBOARD ENGINE & ANIMATED ICONS
  // ============================================================================

  // Animated WebP Icons Dictionary (Assets loaded from ../assets/animated icons/)
  const ANIM_ICONS = {
    home: '../assets/animated icons/wired-outline-63-home-in-reveal.webp',
    inbox: '../assets/animated icons/wired-outline-3090-mail-open-document-in-reveal.webp',
    sent: '../assets/animated icons/wired-outline-177-mail-fast-in-assembly.webp',
    drafts: '../assets/animated icons/wired-outline-245-file-pencil-in-reveal.webp',
    archives: '../assets/animated icons/wired-outline-12-layers-in-reveal.webp',
    seal: '../assets/animated icons/wired-outline-3235-badge-ribbon-in-reveal.webp',
    voting: '../assets/animated icons/wired-outline-1933-hand-voting-in-reveal.webp',
    folder: '../assets/animated icons/wired-outline-120-folder-in-reveal.webp',
    admin: '../assets/animated icons/wired-outline-680-avatar-man-it-developer-in-reveal.webp',
    policy: '../assets/animated icons/wired-outline-966-file-policy-in-reveal.webp',
    chatting: '../assets/animated icons/wired-outline-981-avatars-chatting-in-reveal.webp',
    search: '../assets/animated icons/wired-outline-19-magnifier-in-reveal.webp',
    check: '../assets/animated icons/wired-outline-37-check-in-reveal.webp',
    pencil: '../assets/animated icons/wired-outline-35-pencil-in-reveal.webp',
    share: '../assets/animated icons/wired-outline-259-share-square-arrow-in-reveal.webp',
    download: '../assets/animated icons/wired-outline-3379-arrows-down-in-reveal.webp',
    signboard: '../assets/animated icons/wired-outline-1459-signboard-retro-in-reveal.webp',
    exit: '../assets/animated icons/wired-outline-1725-person-exit-in-reveal.webp',
    man: '../assets/animated icons/wired-outline-268-avatar-man-in-reveal.webp',
    woman: '../assets/animated icons/wired-outline-269-avatar-woman-in-reveal.webp',
    confetti: '../assets/animated icons/wired-outline-1103-confetti-in-reveal.webp'
  };

  const TALLIE_ICONS = {
    clock: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10 1.875C5.51269 1.875 1.875 5.51269 1.875 10C1.875 14.4873 5.51269 18.125 10 18.125C14.4873 18.125 18.125 14.4873 18.125 10C18.125 5.51269 14.4873 1.875 10 1.875ZM10 16.875C6.20304 16.875 3.125 13.797 3.125 10C3.125 6.20304 6.20304 3.125 10 3.125C13.797 3.125 16.875 6.20304 16.875 10C16.875 13.797 13.797 16.875 10 16.875ZM10.625 5.625H9.375V10.625H14.375V9.375H10.625V5.625Z"/></svg>`,
    seal: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M17.4195 8.91953L16.2789 7.77891C16.1031 7.60312 16.0043 7.36465 16.0043 7.11602V5.5C16.0043 5.16848 15.8726 4.85054 15.6382 4.61612C15.4038 4.3817 15.0858 4.25 14.7543 4.25H13.1383C12.8896 4.25 12.6512 4.15117 12.4754 3.97539L11.3348 2.83477C11.1004 2.60039 10.7824 2.46875 10.4509 2.46875C10.1193 2.46875 9.80141 2.60039 9.56703 2.83477L8.42641 3.97539C8.25062 4.15117 8.01215 4.25 7.76352 4.25H6.1475C5.81598 4.25 5.49804 4.3817 5.26362 4.61612C5.0292 4.85054 4.8975 5.16848 4.8975 5.5V7.11602C4.8975 7.36465 4.79867 7.60312 4.62289 7.77891L3.48227 8.91953C3.24789 9.15391 3.11625 9.47184 3.11625 9.80336C3.11625 10.1349 3.24789 10.4528 3.48227 10.6872L4.62289 11.8278C4.79867 12.0036 4.8975 12.2421 4.8975 12.4907V14.1067C4.8975 14.4382 5.0292 14.7562 5.26362 14.9906C5.49804 15.225 5.81598 15.3567 6.1475 15.3567H7.76352C8.01215 15.3567 8.25062 15.4556 8.42641 15.6313L9.56703 16.772C9.80141 17.0063 10.1193 17.138 10.4509 17.138C10.7824 17.138 11.1004 17.0063 11.3348 16.772L12.4754 15.6313C12.6512 15.4556 12.8896 15.3567 13.1383 15.3567H14.7543C15.0858 15.3567 15.4038 15.225 15.6382 14.9906C15.8726 14.7562 16.0043 14.4382 16.0043 14.1067V12.4907C16.0043 12.2421 16.1031 12.0036 16.2789 11.8278L17.4195 10.6872C17.6539 10.4528 17.7855 10.1349 17.7855 9.80336C17.7855 9.47184 17.6539 9.15391 17.4195 8.91953ZM13.8051 8.80508L9.80508 12.8051C9.68787 12.9223 9.5289 12.9881 9.36312 12.9881C9.19734 12.9881 9.03838 12.9223 8.92117 12.8051L6.92117 10.8051C6.80396 10.6879 6.73812 10.5289 6.73812 10.3631C6.73812 10.1973 6.80396 10.0384 6.92117 9.92117C7.03838 9.80396 7.19734 9.73812 7.36312 9.73812C7.5289 9.73812 7.68787 9.80396 7.80508 9.92117L9.36312 11.4792L12.9212 7.92117C13.0384 7.80396 13.1973 7.73812 13.3631 7.73812C13.5289 7.73812 13.6879 7.80396 13.8051 7.92117C13.9223 8.03838 13.9881 8.19734 13.9881 8.36312C13.9881 8.5289 13.9223 8.68787 13.8051 8.80508Z"/></svg>`,
    warning: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M18.5 14.6945L11.668 2.82969C11.4972 2.539 11.2535 2.29798 10.9609 2.13052C10.6684 1.96305 10.3371 1.87495 10 1.87495C9.66289 1.87495 9.33163 1.96305 9.03906 2.13052C8.74648 2.29798 8.50276 2.539 8.33203 2.82969L1.5 14.6945C1.33573 14.9757 1.24916 15.2955 1.24916 15.6211C1.24916 15.9467 1.33573 16.2665 1.5 16.5477C1.66854 16.8401 1.91185 17.0824 2.20497 17.2498C2.49809 17.4171 2.83046 17.5035 3.16797 17.5H16.832C17.1693 17.5032 17.5013 17.4167 17.7941 17.2494C18.087 17.082 18.33 16.8399 18.4984 16.5477C18.6629 16.2666 18.7498 15.9469 18.7501 15.6213C18.7503 15.2957 18.664 14.9758 18.5 14.6945ZM10 13.125a.9375.9375 0 100 1.875.9375.9375 0 000-1.875zm-.625-5v3.125h1.25V8.125h-1.25z"/></svg>`,
    arrows: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10 3.75C7.99427 3.75 6.09848 4.44754 4.59375 5.67969V4.375H3.34375V7.5C3.34375 7.84518 3.62357 8.125 3.96875 8.125H7.09375V6.875H5.4375C6.67188 5.6875 8.27344 5 10 5C12.7614 5 15 7.23858 15 10C15 12.7614 12.7614 15 10 15C7.23858 15 5 12.7614 5 10H3.75C3.75 13.4518 6.54822 16.25 10 16.25C13.4518 16.25 16.25 13.4518 16.25 10C16.25 6.54822 13.4518 3.75 10 3.75Z"/></svg>`,
    arrowUpRight: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;"><path d="M5.625 4.375H15.625V14.375H14.375V6.25859L5.44194 15.1922L4.55806 14.3083L13.4916 5.375H5.625V4.375Z"/></svg>`,
    checkCircle: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10 1.875C5.51269 1.875 1.875 5.51269 1.875 10C1.875 14.4873 5.51269 18.125 10 18.125C14.4873 18.125 18.125 14.4873 18.125 10C18.125 5.51269 14.4873 1.875 10 1.875ZM13.8051 8.05508L9.05508 12.8051C8.93787 12.9223 8.7789 12.9881 8.61312 12.9881C8.44734 12.9881 8.28838 12.9223 8.17117 12.8051L6.17117 10.8051L7.05508 9.92117L8.61312 11.4792L12.9212 7.17117L13.8051 8.05508Z"/></svg>`,
    users: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M7.5 6.25a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm6.25 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 11.25c-2.33 0-7 1.17-7 3.5V16.25h14v-1.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
    file: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M4.375 2.5A1.875 1.875 0 002.5 4.375v11.25c0 1.036.839 1.875 1.875 1.875h11.25c1.036 0 1.875-.839 1.875-1.875V7.5L12.5 2.5H4.375zM11.875 3.75l3.75 3.75H11.875V3.75z"/></svg>`,
    shield: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path d="M10 1.875L3.125 4.375v4.375c0 4.148 2.937 8.026 6.875 8.969 3.938-.943 6.875-4.821 6.875-8.969V4.375L10 1.875zM9.062 12.438l-2.5-2.5 1.062-1.062 1.438 1.437 3.938-3.938 1.062 1.063-5 5z"/></svg>`,
    play: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;"><path d="M6.25 4.375v11.25l9.375-5.625L6.25 4.375z"/></svg>`,
    export: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;"><path d="M10 3.125L5.625 7.5h3.125v6.25h2.5V7.5h3.125L10 3.125zM3.75 15h12.5v1.875H3.75V15z"/></svg>`,
    pen: `<svg viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px;"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`
  };

  function renderTallieStatusPill(status) {
    if (status === 'Approved' || status === 'Dispatched' || status === 'Completed') {
      return `<span class="tallie-status-pill tallie-status-completed"><img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Approved" /> ${escapeHtml(status)}</span>`;
    }
    if (status === 'Returned for Revision' || status === 'Exception') {
      return `<span class="tallie-status-pill tallie-status-exception"><img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Revision" /> ${escapeHtml(status)}</span>`;
    }
    if (status === 'Under Review' || status === 'Processing' || status === 'Department Head Endorsement' || status === 'Directory Lead Review') {
      return `<span class="tallie-status-pill tallie-status-processing"><span class="tallie-live-dot tallie-live-dot-pulse"></span> ${escapeHtml(status)}</span>`;
    }
    if (status === 'Draft') {
      return `<span class="tallie-status-pill tallie-status-neutral"><img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Draft" /> Draft</span>`;
    }
    return `<span class="tallie-status-pill tallie-status-neutral">${escapeHtml(status || 'Active')}</span>`;
  }

  function renderTalliePriorityBadge(priority) {
    if (priority === 'Urgent') {
      return `<span class="tallie-source-badge tallie-source-crimson">Urgent</span>`;
    }
    if (priority === 'Confidential') {
      return `<span class="tallie-source-badge tallie-source-oracle">Confidential</span>`;
    }
    return `<span class="tallie-source-badge tallie-source-sharepoint">${escapeHtml(priority || 'Routine')}</span>`;
  }

  function renderTallieRoleBadge(role) {
    if (role === 'Department Head') {
      return `<span class="tallie-source-badge tallie-source-crimson">Department Head (L3)</span>`;
    }
    if (role === 'Directory Lead') {
      return `<span class="tallie-source-badge tallie-source-oracle">Directory Lead (L2)</span>`;
    }
    if (role === 'Officer') {
      return `<span class="tallie-source-badge tallie-source-emerald">Officer (L1)</span>`;
    }
    return `<span class="tallie-source-badge tallie-source-amber">System Admin (L4)</span>`;
  }

  // ----------------------------------------------------------------------------
  // 4.1 LEVEL 3: DEPARTMENT HEAD DASHBOARD (EXECUTIVE COMMAND CENTER)
  // ----------------------------------------------------------------------------
  function renderDepartmentHeadDashboard(mount, stats, tabLetters, allLetters) {
    const u = state.currentUser;
    const awaitingEndorsement = allLetters.filter(l => l.direction === 'OUTGOING' && l.approval_stage === 'Department Head Endorsement');
    const incomingMinisterial = allLetters.filter(l => l.direction === 'INCOMING');

    mount.innerHTML = `
      <div class="tallie-dashboard">
        <!-- Top Executive Header -->
        <div class="tallie-header">
          <div class="tallie-header-info">
            <h1 class="tallie-title">Executive Command Center</h1>
            <p class="tallie-subtitle">Supreme Endorsement &amp; Ministerial Oversight · Dr. Bezabih Alemu (Head of Department)</p>
          </div>
          <div class="tallie-header-actions">
            <span class="tallie-live-badge">
              <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Seal" />
              Live · Legal Seal Active
            </span>
            <button class="tallie-btn tallie-btn-outline" onclick="window.PortalEngine.openReportsModal()">
              <img src="${ANIM_ICONS.download}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Analytics" />
              <span>Department Analytics</span>
            </button>
            <button class="tallie-btn tallie-btn-primary" onclick="window.PortalEngine.openComposeModal()">
              <img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Directive" />
              <span>Issue Executive Directive</span>
            </button>
          </div>
        </div>

        <!-- 4 Metrics Grid -->
        <div class="tallie-metrics-grid">
          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Awaiting Endorsement</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Endorsement" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${awaitingEndorsement.length}</p>
              <div class="tallie-metric-trend">
                <span class="${awaitingEndorsement.length > 0 ? 'tallie-trend-alert' : 'tallie-trend-up'}">
                  <img src="${awaitingEndorsement.length > 0 ? ANIM_ICONS.signboard : ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>${awaitingEndorsement.length > 0 ? 'Awaiting official signature &amp; seal' : 'All submissions endorsed'}</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Ministerial Inbound</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.inbox}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Inbound" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${incomingMinisterial.length}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-live">
                  <img src="${ANIM_ICONS.share}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Trend" />
                </span>
                <span>Federal &amp; regional directives</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Zonal Correspondence</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.archives}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Records" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${stats.totalLetters || 0}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Check" />
                </span>
                <span>Across 9 active directories</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">High-Priority Flagged</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.signboard}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Alert" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${stats.urgentLetters || 0}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-alert">
                  <img src="${ANIM_ICONS.signboard}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Alert" />
                </span>
                <span>Time-sensitive mandates</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 1: Executive Endorsement Deck -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Seal" />
                <span>Executive Endorsement &amp; Legal Seal Deck</span>
                <span class="tallie-source-badge tallie-source-crimson">${awaitingEndorsement.length} Pending Approval</span>
              </h2>
              <p class="tallie-section-desc">Outgoing letters approved by Directory Leads awaiting final executive digital signature, legal seal, and cryptographic dispatch.</p>
            </div>
          </div>

          <div class="tallie-table-container">
            ${awaitingEndorsement.length === 0 ? `
              <div class="tallie-empty-state">
                <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-hero" alt="Endorsed" />
                <h4 class="tallie-empty-title">All Submissions Fully Endorsed</h4>
                <p class="tallie-empty-desc">No letters currently require executive clearance. Dispatched correspondence is safely archived in the departmental records.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table class="tallie-table">
                  <thead>
                    <tr>
                      <th style="min-width: 140px;">Status</th>
                      <th style="min-width: 150px;">Reference ID</th>
                      <th style="min-width: 180px;">Drafting Officer</th>
                      <th style="min-width: 260px;">Subject &amp; Summary</th>
                      <th style="min-width: 100px;">Priority</th>
                      <th style="min-width: 240px; text-align: right;">Executive Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${awaitingEndorsement.map(l => `
                      <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                        <td>${renderTallieStatusPill(l.status)}</td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                            <small class="text-muted">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Recent')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 500;">${escapeHtml(l.sender_name)}</span>
                            <span class="tallie-source-badge tallie-source-oracle" style="align-self: flex-start;">${escapeHtml(l.sender_dir_name || 'HZSITD')}</span>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 600; max-width: 380px;" class="text-truncate" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                            <small class="text-muted text-truncate" style="max-width: 380px;">${escapeHtml(l.body)}</small>
                          </div>
                        </td>
                        <td>${renderTalliePriorityBadge(l.priority)}</td>
                        <td style="text-align: right;" onclick="event.stopPropagation()">
                          <div class="d-flex align-items-center justify-content-end gap-2">
                            <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})">
                              Inspect
                            </button>
                            <button class="tallie-btn tallie-btn-danger tallie-btn-sm" onclick="window.PortalEngine.promptReturnForRevision(${l.id})">
                              Return
                            </button>
                            <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.openSignModal(${l.id})">
                              <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Seal" />
                              <span>Endorse &amp; Sign</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </section>

        <!-- Section 2: Federal & Regional Ministerial Directives -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.inbox}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Inbound" />
                <span>Federal &amp; Regional Ministerial Inbound Directives</span>
                <span class="tallie-live-badge tallie-live-badge-sm">${incomingMinisterial.length} Inbound</span>
              </h2>
              <p class="tallie-section-desc">Official correspondence arriving from higher government ministries. Minute and assign down to Directory Leads with operational instructions.</p>
            </div>
          </div>

          <div class="tallie-table-container">
            ${incomingMinisterial.length === 0 ? `
              <div class="tallie-empty-state">
                <img src="${ANIM_ICONS.inbox}" class="tallie-anim-icon tallie-anim-icon-hero" alt="Inbound" />
                <h4 class="tallie-empty-title">No Pending Ministerial Inbound Directives</h4>
                <p class="tallie-empty-desc">All ministerial correspondence has been routed and assigned to departmental directories.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table class="tallie-table">
                  <thead>
                    <tr>
                      <th style="min-width: 130px;">Status</th>
                      <th style="min-width: 150px;">Tracking Ref</th>
                      <th style="min-width: 200px;">Sending Entity</th>
                      <th style="min-width: 280px;">Subject &amp; Directives</th>
                      <th style="min-width: 100px;">Priority</th>
                      <th style="min-width: 200px; text-align: right;">Executive Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${incomingMinisterial.map(l => `
                      <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                        <td>${renderTallieStatusPill(l.status)}</td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                            <small class="text-muted">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Today')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 500;">${escapeHtml(l.external_sender_org || 'External Ministry')}</span>
                            <small class="text-muted">${escapeHtml(l.external_sender_name || 'Official Sender')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 600; max-width: 340px;" class="text-truncate" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                            <span class="tallie-source-badge ${l.recipient_dir_name ? 'tallie-source-emerald' : 'tallie-source-amber'}" style="align-self: flex-start;">
                              ${l.recipient_dir_name ? 'Assigned: ' + escapeHtml(l.recipient_dir_name) : 'Pending Zonal Assignment'}
                            </span>
                          </div>
                        </td>
                        <td>${renderTalliePriorityBadge(l.priority)}</td>
                        <td style="text-align: right;" onclick="event.stopPropagation()">
                          <div class="d-flex align-items-center justify-content-end gap-2">
                            <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})">
                              View
                            </button>
                            <button class="tallie-btn tallie-btn-blue tallie-btn-sm" onclick="window.PortalEngine.promptAssignDirectory(${l.id})">
                              <img src="${ANIM_ICONS.share}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Assign" />
                              <span>Minute &amp; Assign</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </section>

        <!-- Section 3: 9-Directory Infrastructure & Operations Radar -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.folder}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Radar" />
                <span>HZSITD 9-Directory Infrastructure &amp; Operations Radar</span>
              </h2>
              <p class="tallie-section-desc">Real-time readiness status across all 9 specialized zonal technological directorates.</p>
            </div>
          </div>

          <div class="tallie-overview-grid">
            ${state.directories.map(d => `
              <div class="tallie-overview-card">
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center gap-2">
                      <img src="${ANIM_ICONS.folder}" class="tallie-anim-icon tallie-anim-icon-card" alt="Folder" />
                      <span class="tallie-ref-code">${escapeHtml(d.code)}</span>
                    </div>
                    <span class="tallie-live-badge tallie-live-badge-sm">
                      <span class="tallie-live-dot"></span>
                      Active
                    </span>
                  </div>
                  <h6 style="font-weight: 600; font-size: 1rem; color: #0f172a; margin-bottom: 0.35rem;">${escapeHtml(d.name)}</h6>
                  <small class="text-muted d-block mb-3" style="line-height: 1.4;">${escapeHtml(d.amharic_name || '')}</small>
                </div>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 0.875rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem;">
                  <span class="text-muted">Infrastructure Online</span>
                  <a href="#compose" onclick="window.PortalEngine.openComposeModal()" style="text-decoration: none; font-weight: 600; color: var(--tallie-status-processing);">Route Letter &rarr;</a>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // 4.2 LEVEL 2: DIRECTORY LEAD DASHBOARD (DIRECTORY OPERATIONS HUB)
  // ----------------------------------------------------------------------------
  function renderDirectoryLeadDashboard(mount, stats, tabLetters, allLetters) {
    const u = state.currentUser;
    const dirLetters = allLetters.filter(l => l.sender_directory_id === u.directory_id || l.recipient_directory_id === u.directory_id);
    const subordinateQueue = allLetters.filter(l => l.direction === 'OUTGOING' && l.approval_stage === 'Directory Lead Review' && l.sender_directory_id === u.directory_id);
    const incomingToDelegate = allLetters.filter(l => l.direction === 'INCOMING' && l.recipient_directory_id === u.directory_id && !l.assigned_officer_id);
    const dirOfficers = state.users.filter(usr => usr.directory_id === u.directory_id && usr.role === 'Officer');

    mount.innerHTML = `
      <div class="tallie-dashboard">
        <!-- Top Directory Lead Header -->
        <div class="tallie-header">
          <div class="tallie-header-info">
            <h1 class="tallie-title">Directory Operations Hub</h1>
            <p class="tallie-subtitle">Supervisory Level 2 · ${escapeHtml(u.full_name)} — Director, ${escapeHtml(u.directory_name)}</p>
          </div>
          <div class="tallie-header-actions">
            <span class="tallie-live-badge">
              <img src="${ANIM_ICONS.voting}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Lead" />
              Live · Directory Active
            </span>
            <button class="tallie-btn tallie-btn-primary" onclick="window.PortalEngine.openComposeModal()">
              <img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Draft" />
              <span>Draft Directory Letter</span>
            </button>
          </div>
        </div>

        <!-- 4 Metrics Grid -->
        <div class="tallie-metrics-grid">
          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Subordinate Review Queue</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.voting}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Review" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${subordinateQueue.length}</p>
              <div class="tallie-metric-trend">
                <span class="${subordinateQueue.length > 0 ? 'tallie-trend-live' : 'tallie-trend-up'}">
                  <img src="${subordinateQueue.length > 0 ? ANIM_ICONS.pencil : ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>${subordinateQueue.length > 0 ? 'Drafts awaiting your clearance' : 'Review queue clear'}</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Directives to Delegate</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.share}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Delegate" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${incomingToDelegate.length}</p>
              <div class="tallie-metric-trend">
                <span class="${incomingToDelegate.length > 0 ? 'tallie-trend-alert' : 'tallie-trend-up'}">
                  <img src="${incomingToDelegate.length > 0 ? ANIM_ICONS.signboard : ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>${incomingToDelegate.length > 0 ? 'From Dept Head awaiting assignment' : 'All directives assigned'}</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Directory Officers</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.chatting}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Officers" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${dirOfficers.length}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>Specialized officers under you</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Directory Correspondence</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.folder}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Correspondence" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${dirLetters.length}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>Total directory volume</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 1: Subordinate Clearance Queue (Scenario B Review Gate) -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.voting}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Review" />
                <span>Subordinate Letter Clearance Queue (Scenario B Review)</span>
                <span class="tallie-source-badge tallie-source-oracle">${subordinateQueue.length} Pending Review</span>
              </h2>
              <p class="tallie-section-desc">Official drafts prepared by officers in your directory. Verify technical parameters, BOQ calculations, and forward to Dr. Bezabih for supreme executive endorsement.</p>
            </div>
          </div>

          <div class="tallie-table-container">
            ${subordinateQueue.length === 0 ? `
              <div class="tallie-empty-state">
                <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-hero" alt="Clear" />
                <h4 class="tallie-empty-title">Queue Clear</h4>
                <p class="tallie-empty-desc">All officer drafts in your directory have been reviewed and processed.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table class="tallie-table">
                  <thead>
                    <tr>
                      <th style="min-width: 140px;">Status</th>
                      <th style="min-width: 150px;">Reference ID</th>
                      <th style="min-width: 180px;">Drafting Officer</th>
                      <th style="min-width: 260px;">Subject &amp; Specifications</th>
                      <th style="min-width: 100px;">Priority</th>
                      <th style="min-width: 280px; text-align: right;">Supervisor Clearance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subordinateQueue.map(l => `
                      <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                        <td>${renderTallieStatusPill(l.status)}</td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                            <small class="text-muted">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Recent')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 500;">${escapeHtml(l.sender_name)}</span>
                            <small class="text-muted">${escapeHtml(l.sender_title || 'Officer')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 600; max-width: 360px;" class="text-truncate" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                            <small class="text-muted text-truncate" style="max-width: 360px;">${escapeHtml(l.body)}</small>
                          </div>
                        </td>
                        <td>${renderTalliePriorityBadge(l.priority)}</td>
                        <td style="text-align: right;" onclick="event.stopPropagation()">
                          <div class="d-flex align-items-center justify-content-end gap-2">
                            <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})">
                              Inspect
                            </button>
                            <button class="tallie-btn tallie-btn-danger tallie-btn-sm" onclick="window.PortalEngine.promptReturnForRevision(${l.id})">
                              Return
                            </button>
                            <button class="tallie-btn tallie-btn-emerald tallie-btn-sm" onclick="window.PortalEngine.executeAction(${l.id}, 'approve_to_head', 'Director verified technical parameters and recommends for executive signature.')">
                              <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Approve" />
                              <span>Approve &amp; Elevate</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </section>

        <!-- Section 2: Ministerial Directives Delegation Desk (Scenario A Delegation Gate) -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.share}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Directives" />
                <span>Ministerial Directives Delegation Desk (Scenario A)</span>
                <span class="tallie-live-badge tallie-live-badge-sm">${incomingToDelegate.length} Action Items</span>
              </h2>
              <p class="tallie-section-desc">Ministerial correspondence routed down to your directory by the Department Head. Delegate to an officer who specializes in that domain.</p>
            </div>
          </div>

          <div class="tallie-table-container">
            ${incomingToDelegate.length === 0 ? `
              <div class="tallie-empty-state">
                <img src="${ANIM_ICONS.inbox}" class="tallie-anim-icon tallie-anim-icon-hero" alt="Assigned" />
                <h4 class="tallie-empty-title">No Unassigned Directives</h4>
                <p class="tallie-empty-desc">All incoming letters for your directory have been assigned to officers.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table class="tallie-table">
                  <thead>
                    <tr>
                      <th style="min-width: 130px;">Status</th>
                      <th style="min-width: 150px;">Tracking Ref</th>
                      <th style="min-width: 200px;">External Authority</th>
                      <th style="min-width: 280px;">Directive Instructions</th>
                      <th style="min-width: 100px;">Priority</th>
                      <th style="min-width: 220px; text-align: right;">Delegation</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${incomingToDelegate.map(l => `
                      <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                        <td>${renderTallieStatusPill(l.status)}</td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                            <small class="text-muted">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Today')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 500;">${escapeHtml(l.external_sender_org || 'External Authority')}</span>
                            <small class="text-muted">${escapeHtml(l.external_sender_name || 'Official Sender')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 600; max-width: 340px;" class="text-truncate" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                            <small class="text-muted text-truncate" style="max-width: 340px;">${escapeHtml(l.body)}</small>
                          </div>
                        </td>
                        <td>${renderTalliePriorityBadge(l.priority)}</td>
                        <td style="text-align: right;" onclick="event.stopPropagation()">
                          <div class="d-flex align-items-center justify-content-end gap-2">
                            <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})">
                              View
                            </button>
                            <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.promptDelegateOfficer(${l.id})">
                              <img src="${ANIM_ICONS.share}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Delegate" />
                              <span>Delegate to Officer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </section>

        <!-- Section 3: Directory Team Roster & Active Workload -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.chatting}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Roster" />
                <span>${escapeHtml(u.directory_name)} — Officer Roster</span>
              </h2>
              <p class="tallie-section-desc">Active technical personnel and specialized officers currently assigned to this directory.</p>
            </div>
          </div>

          <div class="tallie-overview-grid">
            ${dirOfficers.length === 0 ? `
              <p class="text-muted p-3">No officers currently registered in this directory.</p>
            ` : dirOfficers.map(off => `
              <div class="tallie-overview-card">
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center gap-2">
                      <img src="${ANIM_ICONS.man}" class="tallie-anim-icon tallie-anim-icon-card" alt="Officer" />
                      <span class="tallie-source-badge tallie-source-emerald">Officer</span>
                    </div>
                    <span class="tallie-live-badge tallie-live-badge-sm">
                      <span class="tallie-live-dot"></span>
                      On Duty
                    </span>
                  </div>
                  <h6 style="font-weight: 600; font-size: 1rem; color: #0f172a; margin-bottom: 0.35rem;">${escapeHtml(off.full_name)}</h6>
                  <small class="text-muted d-block mb-3">${escapeHtml(off.position_title)}</small>
                </div>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8125rem;">
                  <span class="text-muted">${escapeHtml(off.email)}</span>
                  <span class="text-muted">${escapeHtml(off.phone || 'Internal Ext.')}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // 4.3 LEVEL 1: OFFICER DASHBOARD (TASK & DRAFTING WORKBENCH)
  // ----------------------------------------------------------------------------
  function renderOfficerDashboard(mount, stats, tabLetters, allLetters) {
    const u = state.currentUser;
    const assignedDirectives = allLetters.filter(l => l.assigned_officer_id === u.id && l.status === 'Under Review');
    const returnedDrafts = allLetters.filter(l => l.created_by === u.id && l.status === 'Returned for Revision');
    const myDrafts = allLetters.filter(l => l.created_by === u.id && l.status === 'Draft');
    const myCompleted = allLetters.filter(l => l.created_by === u.id && (l.status === 'Dispatched' || l.status === 'Approved'));

    mount.innerHTML = `
      <div class="tallie-dashboard">
        <!-- Top Officer Header -->
        <div class="tallie-header">
          <div class="tallie-header-info">
            <h1 class="tallie-title">Officer Operational Workbench</h1>
            <p class="tallie-subtitle">Operational Level 1 · ${escapeHtml(u.full_name)} (${escapeHtml(u.position_title)}) — ${escapeHtml(u.directory_name)}</p>
          </div>
          <div class="tallie-header-actions">
            <span class="tallie-live-badge">
              <img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Workbench" />
              Live · Workbench Active
            </span>
            <button class="tallie-btn tallie-btn-primary" onclick="window.PortalEngine.openComposeModal()">
              <img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Draft" />
              <span>Draft New Official Letter</span>
            </button>
          </div>
        </div>

        <!-- Returned for Revision Alert Box (Highest Priority Action) -->
        ${returnedDrafts.length > 0 ? `
          <div class="tallie-alert-banner">
            <div class="tallie-alert-header">
              <img src="${ANIM_ICONS.signboard}" class="tallie-anim-icon" style="width:20px;height:20px;" alt="Notice" />
              <span>Revisions Requested by Supervisor (${returnedDrafts.length})</span>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: #475569; line-height: 1.5;">Your supervisor has reviewed your draft and returned it with specific feedback notes. Please make the corrections and resubmit.</p>
            <div class="d-flex flex-column gap-2 mt-3">
              ${returnedDrafts.map(l => `
                <div style="background: #ffffff; border: 1px solid rgba(220, 38, 39, 0.25); border-radius: 0.75rem; padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  <div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                      <span class="tallie-source-badge tallie-source-crimson">Correction Needed</span>
                      <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                    </div>
                    <span style="font-weight: 600; color: #0f172a;">${escapeHtml(l.subject)}</span>
                  </div>
                  <button class="tallie-btn tallie-btn-danger tallie-btn-sm" onclick="window.PortalEngine.openLetterModal(${l.id})">
                    <img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Revise" />
                    <span>Revise &amp; Resubmit</span>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4 Metrics Grid -->
        <div class="tallie-metrics-grid">
          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Directives Assigned to Me</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.inbox}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Assigned Directives" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${assignedDirectives.length}</p>
              <div class="tallie-metric-trend">
                <span class="${assignedDirectives.length > 0 ? 'tallie-trend-live' : 'tallie-trend-up'}">
                  <img src="${assignedDirectives.length > 0 ? ANIM_ICONS.pencil : ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>${assignedDirectives.length > 0 ? 'Delegated by your supervisor' : 'No pending tasks'}</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">My Drafts In-Progress</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-metric" alt="My Drafts" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${myDrafts.length}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Drafts" />
                </span>
                <span>Unsubmitted drafts in preparation</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Revisions Requested</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.signboard}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Revisions" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${returnedDrafts.length}</p>
              <div class="tallie-metric-trend">
                <span class="${returnedDrafts.length > 0 ? 'tallie-trend-alert' : 'tallie-trend-up'}">
                  <img src="${returnedDrafts.length > 0 ? ANIM_ICONS.signboard : ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Status" />
                </span>
                <span>${returnedDrafts.length > 0 ? 'Requiring corrections' : 'Zero revisions pending'}</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Completed &amp; Dispatched</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.sent}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Completed" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${myCompleted.length}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Completed" />
                </span>
                <span>Officially dispatched</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 1: Directives Assigned to Me for Execution (Scenario A Action Desk) -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.inbox}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Directives" />
                <span>Directives Assigned to Me for Execution</span>
                <span class="tallie-live-badge tallie-live-badge-sm">${assignedDirectives.length} Active Directives</span>
              </h2>
              <p class="tallie-section-desc">Ministerial or internal tasks delegated down to you by your Directory Lead. Review the directive instructions and formulate the technical action or draft response.</p>
            </div>
          </div>

          <div class="tallie-table-container">
            ${assignedDirectives.length === 0 ? `
              <div class="tallie-empty-state">
                <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-hero" alt="Clear" />
                <h4 class="tallie-empty-title">No Pending Assigned Directives</h4>
                <p class="tallie-empty-desc">You have completed all active assignments. When new tasks are delegated, they will appear here.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table class="tallie-table">
                  <thead>
                    <tr>
                      <th style="min-width: 140px;">Status</th>
                      <th style="min-width: 150px;">Tracking Ref</th>
                      <th style="min-width: 200px;">Directing Authority</th>
                      <th style="min-width: 280px;">Directive Instructions</th>
                      <th style="min-width: 100px;">Priority</th>
                      <th style="min-width: 200px; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${assignedDirectives.map(l => `
                      <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                        <td>${renderTallieStatusPill(l.status)}</td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                            <small class="text-muted">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Today')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 500;">${escapeHtml(l.external_sender_org || 'Internal Management')}</span>
                            <small class="text-muted">${escapeHtml(l.external_sender_name || 'Directive')}</small>
                          </div>
                        </td>
                        <td>
                          <div class="d-flex flex-column gap-1">
                            <span style="font-weight: 500; max-width: 360px;" class="text-truncate" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                            <small class="text-muted text-truncate" style="max-width: 360px;">${escapeHtml(l.body)}</small>
                          </div>
                        </td>
                        <td>${renderTalliePriorityBadge(l.priority)}</td>
                        <td style="text-align: right;" onclick="event.stopPropagation()">
                          <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})">
                            <img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Action" />
                            <span>Action &amp; Draft Response</span>
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </section>

        <!-- Section 2: Officer Drafts & Submissions Ledger -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.archives}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Ledger" />
                <span>My Correspondence History &amp; Submissions Ledger</span>
              </h2>
              <p class="tallie-section-desc">Complete record of letters you authored, current verification stage, and archival state.</p>
            </div>
          </div>

          <div class="tallie-table-container">
            ${tabLetters.length === 0 ? `
              <div class="tallie-empty-state">
                <img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-hero" alt="Drafts" />
                <h4 class="tallie-empty-title">No Correspondence History</h4>
                <p class="tallie-empty-desc">You have not created any drafts or submissions yet. Use the Draft New Letter button to begin.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table class="tallie-table">
                  <thead>
                    <tr>
                      <th style="min-width: 140px;">Status</th>
                      <th style="min-width: 150px;">Reference ID</th>
                      <th style="min-width: 280px;">Subject</th>
                      <th style="min-width: 100px;">Priority</th>
                      <th style="min-width: 200px;">Current Approval Stage</th>
                      <th style="min-width: 100px; text-align: right;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tabLetters.map(l => `
                      <tr class="tallie-table-row-clickable" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})" style="cursor: pointer;">
                        <td>${renderTallieStatusPill(l.status)}</td>
                        <td>
                          <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
                        </td>
                        <td>
                          <span style="font-weight: 500; max-width: 340px;" class="text-truncate d-block" title="${escapeHtml(l.subject)}">${escapeHtml(l.subject)}</span>
                        </td>
                        <td>${renderTalliePriorityBadge(l.priority)}</td>
                        <td>
                          <span class="tallie-source-badge tallie-source-oracle">${escapeHtml(l.approval_stage)}</span>
                        </td>
                        <td style="text-align: right;" onclick="event.stopPropagation()">
                          <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openLetterDetailsSheet(${l.id})">
                            View
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </section>
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // 4.4 LEVEL 4: SYSTEM ADMINISTRATOR DASHBOARD (GOVERNANCE & TECHNICAL COCKPIT)
  // ----------------------------------------------------------------------------
  function renderSystemAdminDashboard(mount, stats, tabLetters, allLetters) {
    const u = state.currentUser;

    mount.innerHTML = `
      <div class="tallie-dashboard">
        <!-- Top Admin Header -->
        <div class="tallie-header">
          <div class="tallie-header-info">
            <h1 class="tallie-title">System Governance &amp; IT Cockpit</h1>
            <p class="tallie-subtitle">Platform Administration &amp; Cryptographic Audit · ${escapeHtml(u.full_name)} — Lead IT Systems Administrator</p>
          </div>
          <div class="tallie-header-actions">
            <span class="tallie-live-badge">
              <img src="${ANIM_ICONS.admin}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Admin" />
              Live · All Systems Nominal
            </span>
            <button class="tallie-btn tallie-btn-outline" onclick="window.PortalEngine.openSettingsModal()">
              <img src="${ANIM_ICONS.policy}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Settings" />
              <span>System Settings</span>
            </button>
            <button class="tallie-btn tallie-btn-primary" onclick="window.PortalEngine.openAuditModal()">
              <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Audit" />
              <span>Full Audit Trail</span>
            </button>
          </div>
        </div>

        <!-- 4 Metrics Grid -->
        <div class="tallie-metrics-grid">
          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Total Staff Accounts</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.chatting}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Staff" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">${state.users.length}</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Trend" />
                </span>
                <span>Across 4 clearance levels</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Audit Log Records</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.policy}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Audit" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">150+</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Audit Events" />
                </span>
                <span>Immutable cryptographic events</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Directories Online</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.folder}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Directories" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">9 / 9</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-up">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Active" />
                </span>
                <span>All infrastructure active</span>
              </div>
            </div>
          </div>

          <div class="tallie-metric-card">
            <div class="tallie-metric-top">
              <span class="tallie-metric-label">Engine Diagnostics</span>
              <div class="tallie-metric-icon-wrap">
                <img src="${ANIM_ICONS.admin}" class="tallie-anim-icon tallie-anim-icon-metric" alt="Diagnostics" />
              </div>
            </div>
            <div class="tallie-metric-bottom">
              <p class="tallie-metric-value">100%</p>
              <div class="tallie-metric-trend">
                <span class="tallie-trend-live">
                  <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Nominal" />
                </span>
                <span>SQLite WAL Mode · Node 22</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 1: Staff Directory & Access Control Panel -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.chatting}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Staff" />
                <span>Staff Accounts &amp; Role Provisioning Table</span>
                <span class="tallie-source-badge tallie-source-oracle">${state.users.length} Active Staff</span>
              </h2>
              <p class="tallie-section-desc">Active portal staff accounts across all 9 directories with role clearance levels.</p>
            </div>
            <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.openUsersModal()">
              <img src="${ANIM_ICONS.admin}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Manage" />
              <span>Manage User Accounts</span>
            </button>
          </div>

          <div class="tallie-table-container">
            <div style="overflow-x: auto;">
              <table class="tallie-table">
                <thead>
                  <tr>
                    <th style="min-width: 180px;">Staff Member</th>
                    <th style="min-width: 170px;">Role Level</th>
                    <th style="min-width: 220px;">Assigned Directory</th>
                    <th style="min-width: 180px;">Position Title</th>
                    <th style="min-width: 200px;">Official Email</th>
                    <th style="min-width: 120px; text-align: right;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.users.map(usr => `
                    <tr>
                      <td>
                        <span style="font-weight: 600; color: #0f172a;">${escapeHtml(usr.full_name)}</span>
                      </td>
                      <td>${renderTallieRoleBadge(usr.role)}</td>
                      <td>
                        <span class="tallie-source-badge tallie-source-sharepoint">${escapeHtml(usr.directory_name || 'Executive Office')}</span>
                      </td>
                      <td>
                        <small class="text-muted">${escapeHtml(usr.position_title)}</small>
                      </td>
                      <td>
                        <span class="tallie-ref-code">${escapeHtml(usr.email)}</span>
                      </td>
                      <td style="text-align: right;">
                        <span class="tallie-status-pill tallie-status-completed">
                          <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Active" />
                          Active
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Section 2: Platform Security & Cryptographic Integrity Overview -->
        <section class="tallie-section">
          <div class="tallie-section-header">
            <div class="tallie-section-title-wrap">
              <h2 class="tallie-section-title">
                <img src="${ANIM_ICONS.policy}" class="tallie-anim-icon" style="width:24px;height:24px;" alt="Security" />
                <span>Platform Governance &amp; Security Protocols</span>
              </h2>
              <p class="tallie-section-desc">Cryptographic validation parameters, role-based security isolation, and data recovery guarantees.</p>
            </div>
          </div>

          <div class="tallie-overview-grid">
            <div class="tallie-overview-card">
              <div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-card" alt="Crypto" />
                    <span class="tallie-ref-code">SEC-SHA256</span>
                  </div>
                  <span class="tallie-live-badge tallie-live-badge-sm">
                    <span class="tallie-live-dot"></span>
                    Verified
                  </span>
                </div>
                <h6 style="font-weight: 600; font-size: 1rem; color: #0f172a; margin-bottom: 0.35rem;">Cryptographic Document Signatures</h6>
                <p class="text-muted small mb-0" style="line-height: 1.5;">Every endorsed letter generates an immutable SHA-256 hash embedded in a public QR verification token.</p>
              </div>
            </div>

            <div class="tallie-overview-card">
              <div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <img src="${ANIM_ICONS.policy}" class="tallie-anim-icon tallie-anim-icon-card" alt="RBAC" />
                    <span class="tallie-ref-code">SEC-RBAC</span>
                  </div>
                  <span class="tallie-live-badge tallie-live-badge-sm">
                    <span class="tallie-live-dot"></span>
                    Enforced
                  </span>
                </div>
                <h6 style="font-weight: 600; font-size: 1rem; color: #0f172a; margin-bottom: 0.35rem;">4-Level Hierarchical RBAC Isolation</h6>
                <p class="text-muted small mb-0" style="line-height: 1.5;">Officers cannot bypass Directory Leads; Directory Leads cannot seal without Dr. Bezabih's executive signature.</p>
              </div>
            </div>

            <div class="tallie-overview-card">
              <div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="d-flex align-items-center gap-2">
                    <img src="${ANIM_ICONS.admin}" class="tallie-anim-icon tallie-anim-icon-card" alt="WAL" />
                    <span class="tallie-ref-code">SYS-WAL</span>
                  </div>
                  <span class="tallie-live-badge tallie-live-badge-sm">
                    <span class="tallie-live-dot"></span>
                    Synced
                  </span>
                </div>
                <h6 style="font-weight: 600; font-size: 1rem; color: #0f172a; margin-bottom: 0.35rem;">Zero-Data-Loss WAL Pipeline</h6>
                <p class="text-muted small mb-0" style="line-height: 1.5;">Write-Ahead Logging SQLite engine configured with atomic transactions and automated daily snapshot backups.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }
  // ============================================================================
  // 5. TALLIE SIDEBAR & TOPBAR CONTROLLERS
  // ============================================================================

  function setupTallieSidebar() {
    // Populate directory nav items
    populateSidebarDirectories();

    // Bind sidebar collapse toggle
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const sidebar = document.getElementById('tallieSidebar');
    if (collapseBtn && sidebar) {
      collapseBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    // Bind mobile sidebar toggle
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Bind user profile button -> toggle role switcher dropdown
    const profileBtn = document.getElementById('userProfileBtn');
    const roleSwitcher = document.getElementById('roleSwitcherDropdown');
    if (profileBtn && roleSwitcher) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = roleSwitcher.classList.contains('show') || roleSwitcher.classList.contains('open');
        roleSwitcher.classList.toggle('show', !isShown);
        roleSwitcher.classList.toggle('open', !isShown);
      });
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !roleSwitcher.contains(e.target)) {
          roleSwitcher.classList.remove('show');
          roleSwitcher.classList.remove('open');
        }
      });
    }

    // Bind sidebar navigation items
    document.querySelectorAll('.tallie-nav-item[data-nav]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const navKey = item.dataset.nav;
        const dirId = item.dataset.dirId ? parseInt(item.dataset.dirId) : null;
        switchNav(navKey, dirId);

        // Close mobile sidebar after navigation
        if (sidebar) sidebar.classList.remove('mobile-open');
      });
    });

    // Bind sheet backdrop close
    const sheetBackdrop = document.getElementById('tallieSheetBackdrop');
    if (sheetBackdrop) {
      sheetBackdrop.addEventListener('click', () => closeDetailsSheet());
    }
  }

  function setupTallieTopbar() {
    const searchInput = document.getElementById('topbarSearchInput');
    if (!searchInput) return;

    // Ctrl+K / Cmd+K keyboard shortcut to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      // Escape to close search and details sheet
      if (e.key === 'Escape') {
        searchInput.blur();
        closeDetailsSheet();
      }
    });

    // Live search filtering on table rows
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = searchInput.value.trim().toLowerCase();
        const table = document.getElementById('filteredLettersTable');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(query) ? '' : 'none';
        });
      }, 200);
    });
  }

  // Slide-out details sheet for letter inspection (Tallie transaction-details-sheet.tsx)
  async function openLetterDetailsSheet(letterId) {
    const sheet = document.getElementById('tallieDetailsSheet');
    const backdrop = document.getElementById('tallieSheetBackdrop');
    if (!sheet) return;

    // Show loading state
    sheet.innerHTML = `
      <div class="tallie-details-header">
        <span class="text-muted">Loading...</span>
        <button class="tallie-icon-btn" onclick="window.PortalEngine.closeDetailsSheet()">✕</button>
      </div>
      <div class="tallie-details-body">
        <div class="text-center py-5">
          <div class="spinner-border text-dark" role="status"></div>
        </div>
      </div>
    `;
    sheet.classList.add('open');
    if (backdrop) backdrop.classList.add('show');

    try {
      const res = await fetch(`${API_BASE}/letters/${letterId}`);
      const data = await res.json();
      if (!data.success) return;

      const l = data.letter;
      const timeline = data.timeline || [];
      const userRole = state.currentUser ? state.currentUser.role : '';

      sheet.innerHTML = `
        <div class="tallie-details-header">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <img src="${l.direction === 'INCOMING' ? ANIM_ICONS.inbox : ANIM_ICONS.sent}" class="tallie-anim-icon" style="width:22px;height:22px;" alt="Direction" />
              <span class="tallie-source-badge ${l.direction === 'INCOMING' ? 'tallie-source-oracle' : 'tallie-source-emerald'}">${l.direction}</span>
              <span class="tallie-ref-code">${escapeHtml(l.reference_no)}</span>
            </div>
            <div style="font-weight: 600; font-size: 1.05rem; color: #0f172a; margin-top: 0.25rem;">${escapeHtml(l.subject)}</div>
          </div>
          <button class="tallie-icon-btn" onclick="window.PortalEngine.closeDetailsSheet()" title="Close">✕</button>
        </div>

        <div class="tallie-details-body">
          <!-- Overview Cards -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div style="padding: 1rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.35rem;">Status</div>
              <div>${renderTallieStatusPill(l.status)}</div>
            </div>
            <div style="padding: 1rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.35rem;">Priority</div>
              <div>${renderTalliePriorityBadge(l.priority)}</div>
            </div>
            <div style="padding: 1rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.35rem;">Approval Stage</div>
              <div style="font-size: 0.8125rem; font-weight: 500; color: #0f172a;">${escapeHtml(l.approval_stage || 'Initial')}</div>
            </div>
            <div style="padding: 1rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.35rem;">Date Filed</div>
              <div style="font-size: 0.8125rem; font-weight: 500; color: #0f172a;">${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Today')}</div>
            </div>
          </div>

          <!-- Sender / Recipient -->
          <div style="padding: 1.25rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.65rem;">Correspondence Parties</div>
            <div class="d-flex flex-column gap-2" style="font-size: 0.8125rem;">
              <div><strong>From:</strong> ${l.direction === 'INCOMING' ? escapeHtml((l.external_sender_name || '') + ' (' + (l.external_sender_org || 'External') + ')') : escapeHtml(l.sender_name + ' — ' + (l.sender_dir_name || 'HZSITD'))}</div>
              <div><strong>To:</strong> ${l.direction === 'INCOMING' ? escapeHtml(l.recipient_dir_name || 'Executive Office') : escapeHtml(l.external_recipient_name ? l.external_recipient_name + ', ' + (l.external_recipient_org || '') : (l.recipient_dir_name || 'General Delivery'))}</div>
              <div><strong>Type:</strong> ${escapeHtml(l.letter_type || 'Official Letter')}</div>
            </div>
          </div>

          <!-- Letter Body -->
          <div style="padding: 1.25rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.65rem;">Letter Content</div>
            <div style="font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; max-height: 200px; overflow-y: auto; color: #1e293b;">${escapeHtml(l.body)}</div>
          </div>

          <!-- Audit Timeline -->
          ${timeline.length > 0 ? `
            <div style="padding: 1.25rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid var(--tallie-border); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.75rem;">Audit Trail (${timeline.length})</div>
              <div class="d-flex flex-column gap-2">
                ${timeline.map((t, idx) => `
                  <div class="d-flex gap-2 align-items-start" style="font-size: 0.8125rem;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background: var(--tallie-status-processing); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 700; flex-shrink: 0;">${idx + 1}</div>
                    <div>
                      <div style="font-weight: 600; color: #0f172a;">${escapeHtml(t.action)}</div>
                      <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(t.actor_name)} · ${escapeHtml(t.created_at)}</div>
                      ${t.notes ? `<div style="color: #475569; font-size: 0.75rem; margin-top: 0.15rem;">${escapeHtml(t.notes)}</div>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Seal & QR Preview -->
          ${l.verification_hash ? `
            <div style="padding: 1.25rem; background: #f8fafc; border-radius: 0.75rem; border: 1px solid var(--tallie-border); text-align: center;">
              <div style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tallie-fg-subtle); margin-bottom: 0.5rem;">SHA-256 Verification Seal</div>
              <div id="sheetQrCode" style="display: inline-block;"></div>
              <div class="text-truncate" style="max-width: 240px; margin: 0.35rem auto; font-family: var(--tallie-font-mono); font-size: 0.6875rem; color: #64748b;">${escapeHtml(l.verification_hash)}</div>
              <div style="font-size: 0.75rem; font-weight: 600; color: var(--tallie-status-completed); display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
                <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-badge" alt="Verified" />
                VERIFIED &amp; SEALED
              </div>
            </div>
          ` : ''}
        </div>

        <div class="tallie-details-footer">
          <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openFullDocumentModal(${l.id}); window.PortalEngine.closeDetailsSheet();">
            Full Document View
          </button>
          <button class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.PortalEngine.openPrintView(${l.id})">
            <img src="${ANIM_ICONS.download}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Print" />
            <span>Print View</span>
          </button>
          <div class="d-flex gap-2">
            ${userRole === 'Department Head' && l.approval_stage === 'Department Head Endorsement' ? `
              <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.openSignModal(${l.id}); window.PortalEngine.closeDetailsSheet();">
                <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Sign" />
                <span>Endorse &amp; Sign</span>
              </button>
            ` : ''}
            ${userRole === 'Directory Lead' && l.approval_stage === 'Directory Lead Review' ? `
              <button class="tallie-btn tallie-btn-emerald tallie-btn-sm" onclick="window.PortalEngine.executeAction(${l.id}, 'approve_to_head', 'Approved by Director.'); window.PortalEngine.closeDetailsSheet();">
                <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Approve" />
                <span>Approve</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;

      // Render QR code if hash exists
      if (l.verification_hash && window.QRCode) {
        setTimeout(() => {
          const qrContainer = document.getElementById('sheetQrCode');
          if (qrContainer) {
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
              text: `https://hzsitd.gov.et/verify?ref=${encodeURIComponent(l.reference_no)}&hash=${l.verification_hash}`,
              width: 64,
              height: 64
            });
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error loading letter details for sheet:', err);
    }
  }

  function closeDetailsSheet() {
    const sheet = document.getElementById('tallieDetailsSheet');
    const backdrop = document.getElementById('tallieSheetBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  }

  function openComposeModal() {
    const modalEl = document.getElementById('composeModal');
    if (modalEl) {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
      populateComposeFormUserFields();
    }
  }

  function exportCurrentLettersCsv() {
    const table = document.querySelector('.tallie-table');
    if (!table) {
      showToast('No correspondence table to export.');
      return;
    }

    const rows = table.querySelectorAll('tr');
    let csvContent = '';

    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      const rowData = Array.from(cells).map(cell => {
        let text = cell.textContent.trim().replace(/"/g, '""').replace(/\n/g, ' ');
        return `"${text}"`;
      });
      csvContent += rowData.join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HZSITD_Letters_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('CSV exported successfully.');
  }

  async function loadLettersTable(tab) {
    const paneId = `${tab}-pane`;
    const pane = document.getElementById(paneId);
    if (!pane) return;

    const tbody = pane.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-6">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mb-0 text-muted mt-2">Loading ${tab} letters...</p>
        </td>
      </tr>
    `;

    try {
      const res = await fetch(`${API_BASE}/letters?tab=${tab}`);
      const data = await res.json();

      if (!data.success || !data.letters || data.letters.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-8">
              <div class="d-flex flex-column align-items-center gap-2">
                <iconify-icon icon="lucide:inbox" class="fs-12 text-muted"></iconify-icon>
                <p class="mb-0 fw-bold fs-4">No letters in ${tab}</p>
                <small class="text-muted">Correspondence for your role (${state.currentUser?.role || ''}) will appear here.</small>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.letters.map(letter => renderLetterRow(letter, tab)).join('');
    } catch (err) {
      console.error(`Error loading ${tab} letters:`, err);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load letters.</td></tr>`;
    }
  }

  function renderLetterRow(letter, tab) {
    // Priority badge
    let priorityBadge = `<span class="badge bg-light text-dark">${letter.priority}</span>`;
    if (letter.priority === 'Urgent') priorityBadge = `<span class="badge badge-urgent"><iconify-icon icon="lucide:flame" class="align-middle"></iconify-icon> Urgent</span>`;
    else if (letter.priority === 'Confidential') priorityBadge = `<span class="badge badge-confidential">Confidential</span>`;

    // Status badge
    let statusClass = 'badge-under-review';
    if (letter.status === 'Draft') statusClass = 'badge-draft';
    else if (letter.status === 'Pending Department Head') statusClass = 'badge-pending-head';
    else if (letter.status === 'Dispatched') statusClass = 'badge-dispatched';
    else if (letter.status === 'Returned for Revision') statusClass = 'badge-returned';
    else if (letter.status === 'Archived') statusClass = 'badge-archived';

    const directionBadge = letter.direction === 'INCOMING' 
      ? '<span class="badge bg-info text-white me-1">IN</span>' 
      : '<span class="badge bg-secondary text-white me-1">OUT</span>';

    // From / To columns
    const senderDisplay = letter.direction === 'INCOMING' 
      ? (letter.external_sender_org || letter.external_sender_name || 'External')
      : (letter.sender_name || letter.sender_dir_short || 'Staff');

    const recipientDisplay = letter.direction === 'INCOMING'
      ? (letter.recipient_dir_short || 'Executive Office')
      : (letter.external_recipient_org || letter.recipient_dir_short || 'External Office');

    const partyDisplay = tab === 'sent' ? recipientDisplay : senderDisplay;

    const dateDisplay = letter.created_at ? letter.created_at.split(' ')[0] : 'Today';

    return `
      <tr>
        <td class="fw-bold">
          <a href="javascript:void(0)" onclick="window.PortalEngine.openLetterModal(${letter.id})" class="text-decoration-none text-dark hover-primary d-flex align-items-center gap-1">
            ${directionBadge}
            <span>${letter.reference_no}</span>
          </a>
        </td>
        <td>
          <div class="fw-bold text-truncate" style="max-width: 280px;" title="${letter.subject}">
            ${letter.subject}
          </div>
          <small class="text-muted">${letter.letter_type || 'Official'}</small>
        </td>
        <td>
          <span class="d-inline-block text-truncate" style="max-width: 180px;">${partyDisplay}</span>
        </td>
        <td><small class="text-muted">${dateDisplay}</small></td>
        <td>${priorityBadge}</td>
        <td>
          <span class="badge-status ${statusClass}">
            <iconify-icon icon="lucide:circle" class="fs-1"></iconify-icon>
            ${letter.status}
          </span>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-portal-white d-flex align-items-center gap-1 py-1 px-2" 
                    onclick="window.PortalEngine.openLetterModal(${letter.id})">
              <iconify-icon icon="lucide:eye"></iconify-icon>
              <span>View</span>
            </button>
            ${renderQuickActionButton(letter)}
          </div>
        </td>
      </tr>
    `;
  }

  function renderQuickActionButton(letter) {
    const role = state.currentUser ? state.currentUser.role : '';

    if (role === 'Department Head' && letter.approval_stage === 'Department Head Endorsement') {
      return `
        <button class="btn btn-sm btn-portal-danger d-flex align-items-center gap-1 py-1 px-2 text-white" 
                onclick="window.PortalEngine.openSignModal(${letter.id})">
          <iconify-icon icon="lucide:pen-tool"></iconify-icon>
          <span>Sign &amp; Seal</span>
        </button>
      `;
    }

    if (role === 'Directory Lead' && letter.approval_stage === 'Directory Lead Review') {
      return `
        <button class="btn btn-sm btn-portal-primary d-flex align-items-center gap-1 py-1 px-2 text-white" 
                onclick="window.PortalEngine.openLetterModal(${letter.id})">
          <iconify-icon icon="lucide:check-circle"></iconify-icon>
          <span>Review</span>
        </button>
      `;
    }

    if (letter.status === 'Returned for Revision' && role === 'Officer') {
      return `
        <button class="btn btn-sm btn-portal-warning d-flex align-items-center gap-1 py-1 px-2 text-white" 
                onclick="window.PortalEngine.openLetterModal(${letter.id})">
          <iconify-icon icon="lucide:edit-3"></iconify-icon>
          <span>Revise</span>
        </button>
      `;
    }

    return '';
  }

  // ============================================================================
  // 6. COMPOSE FORM (AUTONOMOUS LOGIC & ATTACHMENT UPLOADS)
  // ============================================================================

  function populateDirectoryDropdowns() {
    const dirSelect = document.querySelector('#compose select');
    if (!dirSelect) return;

    const currentVal = dirSelect.value;
    dirSelect.innerHTML = `<option value="" selected disabled>Select destination directory</option>` +
      state.directories.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    if (currentVal) dirSelect.value = currentVal;
  }

  function populateComposeFormUserFields() {
    const u = state.currentUser;
    if (!u) return;

    const composeSection = document.getElementById('compose');
    if (!composeSection) return;

    // Sender Name input
    const senderNameInput = composeSection.querySelectorAll('input[readonly]')[0];
    if (senderNameInput) senderNameInput.value = `${u.full_name} (${u.position_title})`;

    // Sender Directory input
    const senderDirInput = composeSection.querySelectorAll('input[readonly]')[1];
    if (senderDirInput) senderDirInput.value = u.directory_name || 'HZSITD Executive Office';
  }

  function setupComposeForm() {
    populateComposeFormUserFields();

    const composeForm = document.querySelector('#compose form');
    if (!composeForm) return;

    // Attach File Upload Handler
    const fileInput = composeForm.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            state.attachedFiles.push(data.file);
            showToast(`Attachment uploaded: ${data.file.original_name}`);
          }
        } catch (err) {
          console.error('File upload error:', err);
        }
      });
    }

    // Submit Letter Form
    composeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitLetter(false);
    });

    // Save as Draft button
    const draftBtn = document.getElementById('saveDraftBtn') || composeForm.querySelector('button[type="button"]');
    if (draftBtn) {
      draftBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await submitLetter(true);
      });
    }
  }

  async function submitLetter(isDraft) {
    const composeForm = document.querySelector('#compose form');
    if (!composeForm) return;

    const dirSelect = composeForm.querySelector('select');
    const subjectInput = composeForm.querySelector('input[placeholder*="subject"]');
    const bodyTextarea = composeForm.querySelector('textarea');
    const priorityRadios = composeForm.querySelectorAll('input[name="priority"]');

    let priority = 'Normal';
    priorityRadios.forEach(r => {
      if (r.checked) {
        if (r.id === 'priorityUrgent') priority = 'Urgent';
        else if (r.id === 'priorityConfidential') priority = 'Confidential';
        else priority = 'Routine';
      }
    });

    const letterTypeSelect = composeForm.querySelectorAll('select')[1];
    const letterType = letterTypeSelect ? letterTypeSelect.value : 'Official Letter';

    const subject = subjectInput ? subjectInput.value.trim() : '';
    const body = bodyTextarea ? bodyTextarea.value.trim() : '';
    const recipient_directory_id = dirSelect ? dirSelect.value : null;

    if (!subject || !body) {
      alert('Please fill in both the Subject and Letter Body.');
      return;
    }

    const payload = {
      direction: 'OUTGOING',
      subject,
      body,
      priority,
      letter_type: letterType || 'Official Letter',
      recipient_directory_id: recipient_directory_id ? parseInt(recipient_directory_id) : null,
      is_draft: isDraft
    };

    try {
      const res = await fetch(`${API_BASE}/letters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast(isDraft ? 'Letter saved as draft!' : `Letter submitted! Ref: ${data.referenceNo}`);
        composeForm.reset();
        populateComposeFormUserFields();
        state.attachedFiles = [];

        // Close compose modal cleanly
        const modalEl = document.getElementById('composeModal');
        if (modalEl) {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) bsModal.hide();
        }

        // Reload stats, dashboard, and badges
        await Promise.all([renderRoleDashboard(), updateSidebarBadges()]);
      } else {
        alert(data.message || 'Error submitting letter.');
      }
    } catch (err) {
      console.error('Error submitting letter:', err);
    }
  }

  // ============================================================================
  // 7. LETTER DETAIL MODAL & OFFICIAL LETTERHEAD PREVIEW
  // ============================================================================

  async function openLetterModal(letterId) {
    return openLetterDetailsSheet(letterId);
  }

  async function openFullDocumentModal(letterId) {
    state.activeLetterId = letterId;

    try {
      const res = await fetch(`${API_BASE}/letters/${letterId}`);
      const data = await res.json();
      if (!data.success) return;

      state.activeLetter = data.letter;

      // Render Modal
      renderLetterModalHtml(data);

      const modalEl = document.getElementById('letterDetailModal');
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    } catch (err) {
      console.error('Error loading letter details:', err);
    }
  }

  async function openPrintView(letterId) {
    try {
      const res = await fetch(`${API_BASE}/letters/${letterId}`);
      const data = await res.json();
      if (!data.success) return;
      const l = data.letter;

      const printWin = window.open('', '_blank');
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>HZSITD Official Letter — ${escapeHtml(l.reference_no)}</title>
          <link rel="stylesheet" href="../assets/libs/bootstrap/dist/css/bootstrap.min.css">
          <link rel="stylesheet" href="../assets/css/letter-portal.css">
          <style>
            body { background: #ffffff !important; padding: 2.5rem; font-family: 'Times New Roman', Times, serif; }
            .official-letterhead { box-shadow: none !important; border: 1px solid #e2e8f0 !important; max-width: 820px !important; margin: 0 auto; padding: 48px; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0 !important; }
              .official-letterhead { border: none !important; padding: 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print text-center mb-4">
            <button class="tallie-btn tallie-btn-primary" onclick="window.print()">🖨️ Print Official Letter</button>
            <button class="tallie-btn tallie-btn-outline ms-2" onclick="window.close()">Close Window</button>
          </div>
          <div class="official-letterhead">
            <div class="letterhead-top">
              <div class="letterhead-title-amharic">በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የሀዲያ ዞን አስተዳደር</div>
              <div class="letterhead-title-en">HADIYA ZONE ADMINISTRATION — REGIONAL GOVERNMENT</div>
              <div class="letterhead-dept-en mt-1">SCIENCE &amp; INFORMATION TECHNOLOGY DEPARTMENT</div>
              <small class="text-muted d-block mt-1">P.O. Box 114, Hossana, Ethiopia | Tel: +251-46-555-0100 | Email: info@hzsitd.gov.et</small>
            </div>

            <div class="letter-meta-grid">
              <div>
                <div><strong>Ref No:</strong> ${escapeHtml(l.reference_no)}</div>
                <div><strong>Letter Type:</strong> ${escapeHtml(l.letter_type)}</div>
                <div><strong>Priority:</strong> ${escapeHtml(l.priority)}</div>
              </div>
              <div class="text-end">
                <div><strong>Date:</strong> ${escapeHtml(l.created_at ? l.created_at.split(' ')[0] : 'Today')}</div>
                <div><strong>Security:</strong> ${escapeHtml(l.security_classification || 'Official')}</div>
                <div><strong>Status:</strong> ${escapeHtml(l.status)}</div>
              </div>
            </div>

            <div class="mb-4">
              <div><strong>From:</strong> ${escapeHtml(l.direction === 'INCOMING' ? ((l.external_sender_name || '') + ' (' + (l.external_sender_org || '') + ')') : (l.sender_name + ' — ' + (l.sender_dir_name || 'Staff')))}</div>
              <div><strong>To:</strong> ${escapeHtml(l.direction === 'INCOMING' ? (l.recipient_dir_name || 'Executive Office') : (l.external_recipient_name ? l.external_recipient_name + ', ' + (l.external_recipient_org || '') : (l.recipient_dir_name || 'General Delivery')))}</div>
              <div class="mt-3"><strong>SUBJECT:</strong> <u class="fw-bold">${escapeHtml(l.subject)}</u></div>
            </div>

            <div class="letter-body-content" style="white-space: pre-wrap; font-size: 1.05rem; line-height: 1.8; margin-bottom: 40px;">
              ${escapeHtml(l.body)}
            </div>

            <div class="letter-endorsement-block" style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <div>
                ${l.stamp_data ? `<img src="${l.stamp_data}" alt="Official Stamp" style="max-height: 100px;">` : '<div class="text-muted small">[Official Stamp Affixed Upon Endorsement]</div>'}
              </div>
              <div class="text-center">
                ${l.digital_signature ? `<img src="${l.digital_signature}" alt="Digital Signature" style="max-height: 60px;">` : '<div class="text-muted small">[Pending Executive Signature]</div>'}
                <div class="fw-bold mt-1">${escapeHtml(l.endorsed_by_name || 'Dr. Bezabih Alemu')}</div>
                <div class="small text-muted">${escapeHtml(l.endorsed_by_title || 'Head of Department')}</div>
              </div>
              <div class="text-end">
                <div class="small font-monospace">${escapeHtml(l.verification_hash ? l.verification_hash.substring(0, 16) + '...' : '')}</div>
                <small class="text-success fw-bold">${l.verification_hash ? 'CRYPTOGRAPHICALLY VERIFIED' : ''}</small>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      console.error('Print view error:', err);
    }
  }

  function renderLetterModalHtml(data) {
    let existingModal = document.getElementById('letterDetailModal');
    if (existingModal) existingModal.remove();

    const l = data.letter;
    const timeline = data.timeline || [];
    const comments = data.comments || [];
    const attachments = data.attachments || [];
    const userRole = state.currentUser ? state.currentUser.role : '';

    // Stepper States
    const isStep1Done = true;
    const isStep2Done = l.approval_stage === 'Directory Lead Review' || l.approval_stage === 'Department Head Endorsement' || l.approval_stage === 'Completed';
    const isStep3Done = l.approval_stage === 'Department Head Endorsement' || l.approval_stage === 'Completed';
    const isStep4Done = l.approval_stage === 'Completed';
    const isReturned = l.status === 'Returned for Revision';

    const modalHtml = `
      <div class="modal fade" id="letterDetailModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-letter-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content shadow-lg border-0" style="border-radius: 14px; overflow: hidden;">
            <!-- Modal Header -->
            <div class="modal-header px-4 py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-2">
                <img src="${l.direction === 'INCOMING' ? ANIM_ICONS.inbox : ANIM_ICONS.sent}" class="tallie-anim-icon" style="width: 26px; height: 26px;" alt="Letter" />
                <span class="tallie-source-badge ${l.direction === 'INCOMING' ? 'tallie-source-oracle' : 'tallie-source-emerald'}">${l.direction}</span>
                <h5 class="modal-title mb-0" style="font-weight: 600; font-size: 1.125rem; color: #0f172a;">${escapeHtml(l.reference_no)}</h5>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <!-- Modal Nav Tabs -->
            <div class="px-4 pt-3 bg-white border-bottom">
              <ul class="nav nav-pills" id="modalLetterTabs" role="tablist">
                <li class="nav-item">
                  <button class="nav-link active py-2 px-3 fw-bold" id="doc-tab" data-bs-toggle="pill" data-bs-target="#modal-doc-pane" type="button">
                    <img src="${ANIM_ICONS.drafts}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Doc" />
                    <span>Official Document</span>
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link py-2 px-3 fw-bold" id="timeline-tab" data-bs-toggle="pill" data-bs-target="#modal-timeline-pane" type="button">
                    <img src="${ANIM_ICONS.policy}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Timeline" />
                    <span>Audit Timeline (${timeline.length})</span>
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link py-2 px-3 fw-bold" id="comments-tab" data-bs-toggle="pill" data-bs-target="#modal-comments-pane" type="button">
                    <img src="${ANIM_ICONS.chatting}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Notes" />
                    <span>Minutes &amp; Notes (${comments.length})</span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Modal Body -->
            <div class="modal-body p-4 bg-light">
              <div class="tab-content" id="modalLetterTabContent">
                
                <!-- TAB 1: OFFICIAL LETTERHEAD PREVIEW -->
                <div class="tab-pane fade show active" id="modal-doc-pane" role="tabpanel">
                  
                  <!-- Stepper -->
                  <div class="workflow-pipeline">
                    <div class="workflow-step completed">
                      <div class="workflow-circle"><iconify-icon icon="lucide:check"></iconify-icon></div>
                      <div class="workflow-label">1. Draft Prepared</div>
                    </div>
                    <div class="workflow-step ${isStep2Done ? 'completed' : (l.approval_stage === 'Directory Lead Review' ? 'active' : '')}">
                      <div class="workflow-circle">${isStep2Done ? '<iconify-icon icon="lucide:check"></iconify-icon>' : '2'}</div>
                      <div class="workflow-label">2. Lead Review</div>
                    </div>
                    <div class="workflow-step ${isStep3Done ? 'completed' : (l.approval_stage === 'Department Head Endorsement' ? 'active' : '')}">
                      <div class="workflow-circle">${isStep3Done ? '<iconify-icon icon="lucide:check"></iconify-icon>' : '3'}</div>
                      <div class="workflow-label">3. Head Endorsement</div>
                    </div>
                    <div class="workflow-step ${isStep4Done ? 'completed' : ''} ${isReturned ? 'returned' : ''}">
                      <div class="workflow-circle">${isStep4Done ? '<iconify-icon icon="lucide:check"></iconify-icon>' : (isReturned ? '<iconify-icon icon="lucide:x"></iconify-icon>' : '4')}</div>
                      <div class="workflow-label">${isReturned ? 'Returned for Revision' : '4. Dispatched & Sealed'}</div>
                    </div>
                  </div>

                  <!-- Printable Official Letterhead -->
                  <div class="official-letterhead">
                    <div class="letterhead-top">
                      <div class="letterhead-title-amharic">በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የሀዲያ ዞን አስተዳደር</div>
                      <div class="letterhead-title-en">HADIYA ZONE ADMINISTRATION — REGIONAL GOVERNMENT</div>
                      <div class="letterhead-dept-en mt-1">SCIENCE &amp; INFORMATION TECHNOLOGY DEPARTMENT</div>
                      <small class="text-muted d-block mt-1">P.O. Box 114, Hossana, Ethiopia | Tel: +251-46-555-0100 | Email: info@hzsitd.gov.et</small>
                    </div>

                    <div class="letter-meta-grid">
                      <div>
                        <div><strong>Ref No:</strong> ${l.reference_no}</div>
                        <div><strong>Letter Type:</strong> ${l.letter_type}</div>
                        <div><strong>Priority:</strong> <span class="badge ${l.priority === 'Urgent' ? 'bg-danger' : 'bg-secondary'}">${l.priority}</span></div>
                      </div>
                      <div class="text-end">
                        <div><strong>Date:</strong> ${l.created_at ? l.created_at.split(' ')[0] : ''}</div>
                        <div><strong>Security:</strong> ${l.security_classification || 'Official'}</div>
                        <div><strong>Status:</strong> <span class="fw-bold">${l.status}</span></div>
                      </div>
                    </div>

                    <div class="mb-4">
                      <div><strong>From:</strong> ${l.direction === 'INCOMING' ? (l.external_sender_name + ' (' + l.external_sender_org + ')') : (l.sender_name + ' — ' + (l.sender_dir_name || 'Staff'))}</div>
                      <div><strong>To:</strong> ${l.direction === 'INCOMING' ? (l.recipient_dir_name || 'Executive Office') : (l.external_recipient_name ? l.external_recipient_name + ', ' + (l.external_recipient_org || '') : (l.recipient_dir_name || 'General Delivery'))}</div>
                      <div class="mt-3"><strong>SUBJECT:</strong> <u class="fw-bold">${l.subject}</u></div>
                    </div>

                    <div class="letter-body-content">
                      ${escapeHtml(l.body)}
                    </div>

                    <!-- Endorsement & Seal Section -->
                    <div class="letter-endorsement-block">
                      <div class="endorsement-stamp-wrap">
                        ${l.stamp_data ? `<img src="${l.stamp_data}" alt="Official Stamp" class="endorsement-stamp-img">` : '<div class="text-muted small p-2 border border-dashed text-center" style="width:110px;height:110px;">[Department Stamp Affixed Upon Endorsement]</div>'}
                      </div>

                      <div class="endorsement-sig-wrap">
                        ${l.digital_signature ? `<img src="${l.digital_signature}" alt="Digital Signature" class="endorsement-sig-img">` : '<div class="text-muted small mb-2">[Pending Executive Signature]</div>'}
                        <div class="fw-bold fs-3">${l.endorsed_by_name || 'Dr. Bezabih Alemu'}</div>
                        <div class="small text-muted">${l.endorsed_by_title || 'Head of Department'}</div>
                        <div class="small text-muted">HZSITD Official Endorsement</div>
                      </div>

                      <div class="endorsement-qr-box">
                        ${l.verification_hash ? `
                          <div id="modalQrCode"></div>
                          <div class="text-truncate" style="max-width: 100px;">${l.verification_hash.substring(0, 12)}...</div>
                          <small class="text-success fw-bold">VERIFIED</small>
                        ` : `
                          <iconify-icon icon="lucide:qr-code" class="fs-10 text-muted"></iconify-icon>
                          <div>QR Code Hash</div>
                          <small class="text-muted">On Dispatch</small>
                        `}
                      </div>
                    </div>
                  </div>

                </div>

                <!-- TAB 2: AUDIT TIMELINE -->
                <div class="tab-pane fade" id="modal-timeline-pane" role="tabpanel">
                  <div class="card p-4 border-0 shadow-sm" style="border-radius: 10px;">
                    <h6 class="fw-bold mb-3" style="color: #0f172a;">Permanent Cryptographic Audit Log</h6>
                    <ul class="list-unstyled d-flex flex-column gap-4 mb-0">
                      ${timeline.map((t, idx) => `
                        <li class="d-flex gap-3">
                          <div class="round-32 rounded-circle bg-primary text-white flex-shrink-0 hstack justify-content-center fw-bold">
                            ${idx + 1}
                          </div>
                          <div class="flex-grow-1">
                            <div class="d-flex justify-content-between">
                              <h6 class="mb-0 fw-bold" style="color: #0f172a;">${t.action}</h6>
                              <small class="text-muted">${t.created_at}</small>
                            </div>
                            <p class="mb-1 text-dark">${t.notes || ''}</p>
                            <small class="text-muted"><iconify-icon icon="lucide:user" class="align-middle"></iconify-icon> ${t.actor_name} (${t.actor_role})</small>
                          </div>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                </div>

                <!-- TAB 3: MINUTES & INTERNAL NOTES -->
                <div class="tab-pane fade" id="modal-comments-pane" role="tabpanel">
                  <div class="card p-4 border-0 shadow-sm" style="border-radius: 10px;">
                    <h6 class="fw-bold mb-3" style="color: #0f172a;">Internal Routing Minutes &amp; Directives</h6>
                    <div class="d-flex flex-column gap-3 mb-4">
                      ${comments.length === 0 ? '<p class="text-muted">No minutes or comments recorded yet.</p>' : ''}
                      ${comments.map(c => `
                        <div class="p-3 bg-white border rounded">
                          <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="badge ${c.comment_type === 'Revision Request' ? 'bg-danger' : 'bg-primary'}">${c.comment_type}</span>
                            <small class="text-muted">${c.created_at}</small>
                          </div>
                          <p class="mb-2 text-dark fs-3">${escapeHtml(c.comment_text)}</p>
                          <small class="text-muted fw-bold">— ${c.author_name} (${c.author_role})</small>
                        </div>
                      `).join('')}
                    </div>

                    <!-- Add Minute Form -->
                    <div class="border-top pt-3">
                      <label class="form-label fw-bold" style="color: #0f172a;">Add Official Minute / Directive Note</label>
                      <textarea id="modalMinuteText" class="form-control mb-2" rows="3" placeholder="Enter instructions or routing note..."></textarea>
                      <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.submitMinute(${l.id})">
                        <img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Add" />
                        <span>Add Minute</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Modal Footer: Contextual Workflow Actions -->
            <div class="modal-footer bg-white px-4 py-3 d-flex justify-content-between align-items-center flex-wrap gap-2 border-top">
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="tallie-btn tallie-btn-outline tallie-btn-sm" onclick="window.print()">
                  <img src="${ANIM_ICONS.download}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Print" />
                  <span>Print Document</span>
                </button>
              </div>

              <div class="d-flex align-items-center gap-2">
                ${renderModalActionButtons(l, userRole)}
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // If letter has verification hash, render QR Code
    if (l.verification_hash && window.QRCode) {
      setTimeout(() => {
        const qrContainer = document.getElementById('modalQrCode');
        if (qrContainer) {
          qrContainer.innerHTML = '';
          new QRCode(qrContainer, {
            text: `https://hzsitd.gov.et/verify?ref=${encodeURIComponent(l.reference_no)}&hash=${l.verification_hash}`,
            width: 70,
            height: 70
          });
        }
      }, 100);
    }
  }

  function renderModalActionButtons(letter, role) {
    let btns = '';

    // SCENARIO B: OUTGOING APPROVAL ACTIONS
    if (letter.direction === 'OUTGOING') {
      // 1. Officer: If returned, can re-submit
      if (role === 'Officer' && letter.status === 'Returned for Revision') {
        btns += `
          <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.executeAction(${letter.id}, 'submit_to_lead', 'Revised draft resubmitted by Officer.')">
            <img src="${ANIM_ICONS.pencil}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Resubmit" />
            <span>Resubmit to Directory Lead</span>
          </button>
        `;
      }

      // 2. Directory Lead: Can review & approve up to Department Head, or return for revision
      if (role === 'Directory Lead' && letter.approval_stage === 'Directory Lead Review') {
        btns += `
          <button class="tallie-btn tallie-btn-danger tallie-btn-sm" onclick="window.PortalEngine.promptReturnForRevision(${letter.id})">
            <img src="${ANIM_ICONS.signboard}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Return" />
            <span>Return for Revision</span>
          </button>
          <button class="tallie-btn tallie-btn-emerald tallie-btn-sm" onclick="window.PortalEngine.executeAction(${letter.id}, 'approve_to_head', 'Directory Lead approved and forwarded to Department Head.')">
            <img src="${ANIM_ICONS.check}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Approve" />
            <span>Approve &amp; Forward to Dept Head</span>
          </button>
        `;
      }

      // 3. Department Head: Final Executive Endorsement (Digital Signature & Stamp)
      if (role === 'Department Head' && letter.approval_stage === 'Department Head Endorsement') {
        btns += `
          <button class="tallie-btn tallie-btn-danger tallie-btn-sm" onclick="window.PortalEngine.promptReturnForRevision(${letter.id})">
            <img src="${ANIM_ICONS.signboard}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Return" />
            <span>Return for Revision</span>
          </button>
          <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.PortalEngine.openSignModal(${letter.id})">
            <img src="${ANIM_ICONS.seal}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Sign" />
            <span>Endorse, Digitally Sign &amp; Stamp</span>
          </button>
        `;
      }
    }

    // SCENARIO A: INCOMING LETTER ASSIGNMENT ACTIONS
    if (letter.direction === 'INCOMING') {
      // 1. Department Head: Assign to Directory Lead
      if (role === 'Department Head' && (!letter.recipient_directory_id || letter.recipient_directory_id === 1)) {
        btns += `
          <button class="tallie-btn tallie-btn-blue tallie-btn-sm" onclick="window.PortalEngine.promptAssignDirectory(${letter.id})">
            <img src="${ANIM_ICONS.share}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Assign" />
            <span>Assign Down to Directory Lead</span>
          </button>
        `;
      }

      // 2. Directory Lead: Delegate to Officer
      if (role === 'Directory Lead' && !letter.assigned_officer_id) {
        btns += `
          <button class="tallie-btn tallie-btn-blue tallie-btn-sm" onclick="window.PortalEngine.promptDelegateOfficer(${letter.id})">
            <img src="${ANIM_ICONS.share}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Delegate" />
            <span>Delegate to Officer</span>
          </button>
        `;
      }
    }

    return btns;
  }

  // ============================================================================
  // 8. DIGITAL SIGNATURE & OFFICIAL STAMP MODAL (SECTION 4.6 & 19 SPECIFICATION)
  // ============================================================================

  function openSignModal(letterId) {
    state.activeLetterId = letterId;

    let signModal = document.getElementById('digitalSignatureModal');
    if (!signModal) {
      const html = `
        <div class="modal fade" id="digitalSignatureModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow border-0">
              <div class="modal-header bg-dark text-white">
                <div class="d-flex align-items-center gap-2">
                  <iconify-icon icon="lucide:pen-tool" class="text-danger fs-5"></iconify-icon>
                  <h5 class="modal-title mb-0 fs-5">Official Digital Endorsement &amp; Seal</h5>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-4">
                <p class="text-muted mb-3">You are officially endorsing this letter on behalf of <strong>Hadiya Zone Science &amp; IT Department</strong>.</p>
                
                <!-- Signature Mode Radios -->
                <div class="mb-3">
                  <label class="form-label fw-bold">Select Signature Method:</label>
                  <div class="d-flex gap-3 flex-wrap">
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="sigMode" id="sigModeProfile" value="PROFILE" checked>
                      <label class="form-check-label" for="sigModeProfile">Saved Profile Signature</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="sigMode" id="sigModeDraw" value="DRAWN">
                      <label class="form-check-label" for="sigModeDraw">Draw with Stylus/Mouse</label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="sigMode" id="sigModeUpload" value="UPLOADED">
                      <label class="form-check-label" for="sigModeUpload">Upload Scanned Image</label>
                    </div>
                  </div>
                </div>

                <!-- Mode 1: Saved Profile Signature Preview -->
                <div id="sigProfilePane" class="p-3 bg-light border rounded text-center mb-3">
                  <img src="${state.currentUser?.signature_url || ''}" alt="Dr. Bezabih Alemu Signature" style="max-height: 60px;">
                  <div class="small text-muted mt-1">${state.currentUser?.full_name} (${state.currentUser?.position_title})</div>
                </div>

                <!-- Mode 2: Canvas Pad -->
                <div id="sigDrawPane" class="mb-3 d-none">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted">Sign inside the box below:</small>
                    <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" id="clearCanvasBtn">Clear</button>
                  </div>
                  <canvas id="signatureCanvas" width="420" height="150"></canvas>
                </div>

                <!-- Mode 3: Image Upload -->
                <div id="sigUploadPane" class="mb-3 d-none">
                  <input type="file" id="sigImageUploadInput" class="form-control" accept="image/png,image/jpeg,image/svg+xml">
                  <small class="text-muted">Transparent PNG recommended.</small>
                </div>

                <!-- Seal / Stamp Checkbox -->
                <div class="form-check form-switch p-3 bg-light rounded border mb-3">
                  <input class="form-check-input ms-0 me-3" type="checkbox" id="affixStampCheckbox" checked>
                  <label class="form-check-label fw-bold" for="affixStampCheckbox">
                    Affix Official Red Circular Department Seal (Stamp)
                  </label>
                  <small class="text-muted d-block ms-5">Legally validates the document across government organs.</small>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-bold">Executive Minute / Endorsement Remarks (Optional):</label>
                  <textarea id="endorseNotes" class="form-control" rows="2" placeholder="e.g. Approved for official dispatch as recommended."></textarea>
                </div>
              </div>

              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-portal-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-portal-danger fw-bold d-flex align-items-center gap-1 text-white" id="confirmSignBtn">
                  <iconify-icon icon="lucide:shield-check"></iconify-icon>
                  <span>Sign, Seal &amp; Dispatch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      setupSignaturePad();
    }

    const modalEl = document.getElementById('digitalSignatureModal');
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }

  function setupSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      hasDrawn = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    });

    window.addEventListener('mouseup', () => { isDrawing = false; });

    // Touch events for tablets/stylus
    canvas.addEventListener('touchstart', (e) => {
      isDrawing = true;
      hasDrawn = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => { isDrawing = false; });

    const clearBtn = document.getElementById('clearCanvasBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
      });
    }

    // Radio toggles
    const radios = document.querySelectorAll('input[name="sigMode"]');
    radios.forEach(r => {
      r.addEventListener('change', () => {
        state.signatureMode = r.value;
        document.getElementById('sigProfilePane').classList.toggle('d-none', r.value !== 'PROFILE');
        document.getElementById('sigDrawPane').classList.toggle('d-none', r.value !== 'DRAWN');
        document.getElementById('sigUploadPane').classList.toggle('d-none', r.value !== 'UPLOADED');
      });
    });

    // Confirm Sign Button
    const confirmBtn = document.getElementById('confirmSignBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        let customSig = null;
        if (state.signatureMode === 'DRAWN') {
          if (!hasDrawn) {
            alert('Please draw your signature on the pad first.');
            return;
          }
          customSig = canvas.toDataURL('image/png');
        } else if (state.signatureMode === 'UPLOADED') {
          const fileInput = document.getElementById('sigImageUploadInput');
          if (!fileInput || !fileInput.files[0]) {
            alert('Please select a signature image file.');
            return;
          }
          // Read as data URL
          const reader = new FileReader();
          reader.onload = async () => {
            await executeSignAction(reader.result);
          };
          reader.readAsDataURL(fileInput.files[0]);
          return;
        }

        await executeSignAction(customSig);
      });
    }
  }

  async function executeSignAction(customSig) {
    const notes = document.getElementById('endorseNotes')?.value || 'Official endorsement and seal affixed.';

    try {
      const res = await fetch(`${API_BASE}/letters/${state.activeLetterId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'endorse_and_sign',
          notes,
          signature_type: state.signatureMode,
          custom_signature: customSig
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Document officially signed, sealed, and dispatched!');
        
        // Hide sign modal
        const signModal = bootstrap.Modal.getInstance(document.getElementById('digitalSignatureModal'));
        if (signModal) signModal.hide();

        // Refresh dashboard and badges
        await Promise.all([renderRoleDashboard(), updateSidebarBadges()]);
        openLetterDetailsSheet(state.activeLetterId);
      } else {
        alert(data.message || 'Error signing document.');
      }
    } catch (err) {
      console.error('Error signing document:', err);
    }
  }

  // Generic Workflow Action Dispatcher
  async function executeAction(letterId, action, notes) {
    try {
      const res = await fetch(`${API_BASE}/letters/${letterId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Workflow updated: ${action}`);
        await Promise.all([renderRoleDashboard(), updateSidebarBadges()]);
        openLetterDetailsSheet(letterId);
      } else {
        alert(data.message || 'Error executing action.');
      }
    } catch (err) {
      console.error('Action error:', err);
    }
  }

  function promptReturnForRevision(letterId) {
    const notes = prompt('Please enter revision remarks and instructions for the drafting officer:');
    if (notes) {
      executeAction(letterId, 'return_for_revision', notes);
    }
  }

  function promptAssignDirectory(letterId) {
    let dirList = state.directories.map((d, i) => `${i + 1}. ${d.name}`).join('\n');
    const pick = prompt(`Select destination directory number:\n${dirList}`);
    const num = parseInt(pick);
    if (!isNaN(num) && num >= 1 && num <= state.directories.length) {
      const chosenDir = state.directories[num - 1];
      const notes = prompt(`Enter instructions for ${chosenDir.name}:`) || 'Action required.';
      fetch(`${API_BASE}/letters/${letterId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_to_directory',
          recipient_directory_id: chosenDir.id,
          notes
        })
      }).then(r => r.json()).then(async data => {
        if (data.success) {
          showToast(`Assigned to ${chosenDir.name}`);
          await Promise.all([renderRoleDashboard(), updateSidebarBadges()]);
          openLetterDetailsSheet(letterId);
        }
      });
    }
  }

  function promptDelegateOfficer(letterId) {
    // Filter officers in current directory
    const officers = state.users.filter(u => u.role === 'Officer');
    if (officers.length === 0) {
      alert('No officers available to delegate to.');
      return;
    }
    let officerList = officers.map((o, i) => `${i + 1}. ${o.full_name} (${o.position_title})`).join('\n');
    const pick = prompt(`Select officer number to assign:\n${officerList}`);
    const num = parseInt(pick);
    if (!isNaN(num) && num >= 1 && num <= officers.length) {
      const chosenOfficer = officers[num - 1];
      const notes = prompt(`Enter instructions for ${chosenOfficer.full_name}:`) || 'Please execute and report.';
      fetch(`${API_BASE}/letters/${letterId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delegate_to_officer',
          assigned_officer_id: chosenOfficer.id,
          notes
        })
      }).then(r => r.json()).then(async data => {
        if (data.success) {
          showToast(`Delegated to ${chosenOfficer.full_name}`);
          await Promise.all([renderRoleDashboard(), updateSidebarBadges()]);
          openLetterDetailsSheet(letterId);
        }
      });
    }
  }

  async function submitMinute(letterId) {
    const textEl = document.getElementById('modalMinuteText');
    const comment_text = textEl ? textEl.value.trim() : '';
    if (!comment_text) return;

    try {
      const res = await fetch(`${API_BASE}/letters/${letterId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text, comment_type: 'Minute' })
      });
      const data = await res.json();
      if (data.success) {
        textEl.value = '';
        showToast('Minute added.');
        openLetterModal(letterId);
      }
    } catch (err) {
      console.error('Error adding minute:', err);
    }
  }

  // ============================================================================
  // 9. TRACK LETTER SEARCH
  // ============================================================================

  function setupTrackingSearch() {
    const trackSection = document.getElementById('track');
    if (!trackSection) return;

    const input = trackSection.querySelector('input[type="text"]');
    const trackBtn = trackSection.querySelector('a.btn, button.btn');

    async function performTrack() {
      const ref = input ? input.value.trim() : '';
      if (!ref) {
        alert('Please enter a tracking reference number (e.g. HZSITD/OUT/2026/039).');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/letters/track?ref=${encodeURIComponent(ref)}`);
        const data = await res.json();

        const timelineContainer = trackSection.querySelector('ul.list-unstyled');
        if (!timelineContainer) return;

        if (!data.success || !data.letter) {
          timelineContainer.innerHTML = `
            <li class="p-3 bg-light rounded text-center text-danger">
              No tracking records found for <strong>${escapeHtml(ref)}</strong>.
            </li>
          `;
          return;
        }

        const l = data.letter;
        const timeline = data.timeline || [];

        timelineContainer.innerHTML = `
          <li class="p-3 bg-light rounded mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge ${l.direction === 'INCOMING' ? 'bg-info' : 'bg-primary'}">${l.direction}</span>
              <span class="badge ${l.status === 'Dispatched' ? 'bg-success' : 'bg-warning text-dark'}">${l.status}</span>
            </div>
            <div class="fw-bold fs-4">${escapeHtml(l.subject)}</div>
            <small class="text-muted d-block mt-1">Ref: ${l.reference_no} | Endorsed by: ${l.endorsed_by_name || 'In Progress'}</small>
          </li>
        ` + timeline.map((t, idx) => `
          <li class="hstack gap-3">
            <span class="round-32 rounded-circle bg-primary text-white flex-shrink-0 hstack justify-content-center">
              <iconify-icon icon="lucide:check" class="fs-6"></iconify-icon>
            </span>
            <div>
              <h6 class="mb-0 fw-bold">${t.action}</h6>
              <p class="mb-0 text-dark text-opacity-70">${t.notes || ''}</p>
              <small class="text-muted">${t.created_at} — ${t.actor_name} (${t.actor_role})</small>
            </div>
          </li>
        `).join('');

      } catch (err) {
        console.error('Error tracking letter:', err);
      }
    }

    if (trackBtn) {
      trackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        performTrack();
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performTrack();
        }
      });
    }
  }

  // ============================================================================
  // 10. INTER-OFFICE STAFF CHAT WIDGET
  // ============================================================================

  function setupChatWidget() {
    let existingChat = document.getElementById('portalChatDrawer');
    if (existingChat) return;

    const chatHtml = `
      <div id="portalChatDrawer" class="chat-drawer minimized">
        <div class="p-3 bg-dark text-white d-flex align-items-center justify-content-between cursor-pointer" id="chatHeaderToggle" style="cursor: pointer;">
          <div class="d-flex align-items-center gap-2">
            <iconify-icon icon="lucide:message-square" class="text-primary fs-5"></iconify-icon>
            <span class="fw-bold fs-3">Inter-Office Chat</span>
          </div>
          <iconify-icon icon="lucide:chevron-up" id="chatChevron" class="fs-5"></iconify-icon>
        </div>

        <div class="chat-messages-scroll" id="chatMessagesScroll">
          <div class="text-center text-muted small my-2">Official Staff Communications Channel</div>
        </div>

        <div class="p-2 border-top bg-light d-flex gap-2">
          <input type="text" id="chatInputText" class="form-control form-control-sm" placeholder="Type message to staff...">
          <button class="btn btn-portal-primary btn-sm px-3 text-white" id="chatSendBtn">
            <iconify-icon icon="lucide:send"></iconify-icon>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHtml);

    const drawer = document.getElementById('portalChatDrawer');
    const headerToggle = document.getElementById('chatHeaderToggle');
    const chevron = document.getElementById('chatChevron');
    const sendBtn = document.getElementById('chatSendBtn');
    const input = document.getElementById('chatInputText');

    headerToggle.addEventListener('click', () => {
      drawer.classList.toggle('minimized');
      const isMin = drawer.classList.contains('minimized');
      chevron.setAttribute('icon', isMin ? 'lucide:chevron-up' : 'lucide:chevron-down');
      if (!isMin) loadChatMessages();
    });

    async function loadChatMessages() {
      try {
        const res = await fetch(`${API_BASE}/chat?channel=general`);
        const data = await res.json();
        if (data.success && data.messages) {
          const container = document.getElementById('chatMessagesScroll');
          container.innerHTML = data.messages.map(m => {
            const isMine = state.currentUser && m.sender_id === state.currentUser.id;
            return `
              <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
                <div class="small fw-bold opacity-75 mb-1">${escapeHtml(m.sender_name)} (${m.sender_role})</div>
                <div>${escapeHtml(m.message_text)}</div>
              </div>
            `;
          }).join('');
          container.scrollTop = container.scrollHeight;
        }
      } catch (err) {
        console.error('Chat error:', err);
      }
    }

    async function sendChatMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      try {
        await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_text: text, channel: 'general' })
        });
        loadChatMessages();
      } catch (err) {
        console.error('Chat send error:', err);
      }
    }

    sendBtn.addEventListener('click', sendChatMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // ============================================================================
  // 11. UTILITY HELPERS
  // ============================================================================

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4 px-4 py-3 bg-dark text-white rounded-pill shadow-lg';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '600';
    toast.style.transition = 'opacity 0.3s ease';
    toast.innerHTML = `<iconify-icon icon="lucide:check-circle" class="text-primary me-2 align-middle fs-5"></iconify-icon>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================================
  // 12. ADMINISTRATIVE CONTROL MODALS (SECTION 06)
  // ============================================================================

  async function openUsersModal() {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      if (!data.success) return;

      let modalEl = document.getElementById('adminUsersModal');
      if (modalEl) modalEl.remove();

      const html = `
        <div class="modal fade" id="adminUsersModal" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content shadow-lg border-0" style="border-radius: 14px; overflow: hidden;">
              <div class="modal-header px-4 py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <img src="${ANIM_ICONS.chatting}" class="tallie-anim-icon" style="width: 28px; height: 28px;" alt="Users" />
                  <h5 class="modal-title mb-0" style="font-weight: 600; font-size: 1.125rem; color: #0f172a;">Staff &amp; Role Management Directory</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0" style="font-size: 0.875rem;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <tr>
                        <th style="padding: 1rem 1.25rem;">Staff Member</th>
                        <th style="padding: 1rem 1.25rem;">Role Level</th>
                        <th style="padding: 1rem 1.25rem;">Directory</th>
                        <th style="padding: 1rem 1.25rem;">Position Title</th>
                        <th style="padding: 1rem 1.25rem;">Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.users.map(u => `
                        <tr>
                          <td style="padding: 1rem 1.25rem;">
                            <div class="d-flex align-items-center gap-2">
                              <div>
                                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(u.full_name)}</div>
                                <small class="text-muted">@${escapeHtml(u.username)}</small>
                              </div>
                            </div>
                          </td>
                          <td style="padding: 1rem 1.25rem;">
                            ${renderTallieRoleBadge(u.role)}
                          </td>
                          <td style="padding: 1rem 1.25rem;"><small style="font-weight: 500;">${escapeHtml(u.directory_name || 'Executive Office')}</small></td>
                          <td style="padding: 1rem 1.25rem;"><small class="text-muted">${escapeHtml(u.position_title)}</small></td>
                          <td style="padding: 1rem 1.25rem;">
                            <small class="d-block text-dark font-monospace">${escapeHtml(u.email)}</small>
                            <small class="text-muted">${escapeHtml(u.phone || '')}</small>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="modal-footer bg-white border-top px-4 py-3">
                <button type="button" class="tallie-btn tallie-btn-outline" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('adminUsersModal')).show();
    } catch (err) {
      console.error('Error opening users modal:', err);
    }
  }

  async function openAuditModal() {
    try {
      const res = await fetch(`${API_BASE}/audit-logs`);
      const data = await res.json();
      if (!data.success) return;

      let modalEl = document.getElementById('adminAuditModal');
      if (modalEl) modalEl.remove();

      const html = `
        <div class="modal fade" id="adminAuditModal" tabindex="-1">
          <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content shadow-lg border-0" style="border-radius: 14px; overflow: hidden;">
              <div class="modal-header px-4 py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <img src="${ANIM_ICONS.policy}" class="tallie-anim-icon" style="width: 28px; height: 28px;" alt="Audit" />
                  <h5 class="modal-title mb-0" style="font-weight: 600; font-size: 1.125rem; color: #0f172a;">System-Wide Cryptographic Audit Trail</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0 font-monospace" style="font-size: 0.8125rem;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <tr>
                        <th style="padding: 1rem 1.25rem;">Timestamp</th>
                        <th style="padding: 1rem 1.25rem;">Letter Ref</th>
                        <th style="padding: 1rem 1.25rem;">Subject</th>
                        <th style="padding: 1rem 1.25rem;">Actor</th>
                        <th style="padding: 1rem 1.25rem;">Action</th>
                        <th style="padding: 1rem 1.25rem;">Audit Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.logs.map(log => `
                        <tr>
                          <td style="padding: 1rem 1.25rem;" class="text-nowrap text-muted">${escapeHtml(log.created_at)}</td>
                          <td style="padding: 1rem 1.25rem; font-weight: 600; color: #0f172a;">${escapeHtml(log.reference_no)}</td>
                          <td style="padding: 1rem 1.25rem;" class="text-truncate" style="max-width: 240px;" title="${escapeHtml(log.subject)}">${escapeHtml(log.subject)}</td>
                          <td style="padding: 1rem 1.25rem;"><span class="tallie-source-badge tallie-source-sharepoint">${escapeHtml(log.actor_name)} (${escapeHtml(log.actor_role)})</span></td>
                          <td style="padding: 1rem 1.25rem;"><span class="tallie-source-badge tallie-source-oracle">${escapeHtml(log.action)}</span></td>
                          <td style="padding: 1rem 1.25rem;" class="text-truncate" style="max-width: 280px;" title="${escapeHtml(log.notes || '')}">${escapeHtml(log.notes || '')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="modal-footer bg-white border-top px-4 py-3">
                <button type="button" class="tallie-btn tallie-btn-outline" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('adminAuditModal')).show();
    } catch (err) {
      console.error('Error opening audit modal:', err);
    }
  }

  async function openSettingsModal() {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (!data.success) return;

      const s = data.settings;
      let modalEl = document.getElementById('adminSettingsModal');
      if (modalEl) modalEl.remove();

      const html = `
        <div class="modal fade" id="adminSettingsModal" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0" style="border-radius: 14px; overflow: hidden;">
              <div class="modal-header px-4 py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <img src="${ANIM_ICONS.admin}" class="tallie-anim-icon" style="width: 28px; height: 28px;" alt="Settings" />
                  <h5 class="modal-title mb-0" style="font-weight: 600; font-size: 1.125rem; color: #0f172a;">System Parameters &amp; Configuration</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-4 bg-white">
                <div class="mb-3">
                  <label class="form-label small text-dark fw-bold mb-1">Platform Instance</label>
                  <input type="text" class="form-control" value="${escapeHtml(s.system_name || 'HZSITD Paperless Portal')}" readonly style="font-size: 0.875rem;">
                </div>
                <div class="row g-3 mb-3">
                  <div class="col-6">
                    <label class="form-label small text-dark fw-bold mb-1">Active Year</label>
                    <input type="text" class="form-control" value="${escapeHtml(s.current_year || '2026')}" readonly style="font-size: 0.875rem;">
                  </div>
                  <div class="col-6">
                    <label class="form-label small text-dark fw-bold mb-1">Next Sequence</label>
                    <input type="text" class="form-control" value="${escapeHtml(s.next_letter_num || '43')}" readonly style="font-size: 0.875rem;">
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label small text-dark fw-bold mb-1">Automated QR Verification</label>
                  <input type="text" class="form-control" value="ENABLED (SHA-256 Public Verification Hash)" readonly style="font-size: 0.875rem;">
                </div>
                <div class="mb-3">
                  <label class="form-label small text-dark fw-bold mb-1">Department Seal Text</label>
                  <input type="text" class="form-control" value="${escapeHtml(s.department_seal_text || 'HADIYA ZONE GOVERNMENT SCIENCE & IT DEPT')}" readonly style="font-size: 0.875rem;">
                </div>
                <small class="text-muted d-block text-center mt-3" style="font-size: 0.75rem;">Only Lead System Administrator can update system settings.</small>
              </div>
              <div class="modal-footer bg-white border-top px-4 py-3">
                <button type="button" class="tallie-btn tallie-btn-outline" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('adminSettingsModal')).show();
    } catch (err) {
      console.error('Error opening settings modal:', err);
    }
  }

  async function openReportsModal() {
    try {
      const [statsRes, lettersRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/letters?tab=all`)
      ]);
      const statsData = await statsRes.json();
      const lettersData = await lettersRes.json();

      let modalEl = document.getElementById('adminReportsModal');
      if (modalEl) modalEl.remove();

      const s = statsData.stats || {};
      const letters = lettersData.letters || [];

      const incomingCount = letters.filter(l => l.direction === 'INCOMING').length;
      const outgoingCount = letters.filter(l => l.direction === 'OUTGOING').length;

      const html = `
        <div class="modal fade" id="adminReportsModal" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content shadow-lg border-0" style="border-radius: 14px; overflow: hidden;">
              <div class="modal-header px-4 py-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <img src="${ANIM_ICONS.download}" class="tallie-anim-icon" style="width: 28px; height: 28px;" alt="Reports" />
                  <h5 class="modal-title mb-0" style="font-weight: 600; font-size: 1.125rem; color: #0f172a;">Official Correspondence Analytics &amp; Volume Report</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body p-4 bg-white">
                <div class="row g-3 mb-4">
                  <div class="col-4">
                    <div class="p-4 bg-light rounded text-center border">
                      <div class="small text-muted fw-bold mb-1">TOTAL VOLUME</div>
                      <div style="font-size: 2rem; font-weight: 700; color: #0f172a;">${s.totalLetters || 0}</div>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="p-4 bg-light rounded text-center border">
                      <div class="small text-muted fw-bold mb-1">INCOMING (TOP-DOWN)</div>
                      <div style="font-size: 2rem; font-weight: 700; color: var(--tallie-status-processing);">${incomingCount}</div>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="p-4 bg-light rounded text-center border">
                      <div class="small text-muted fw-bold mb-1">OUTGOING (BOTTOM-UP)</div>
                      <div style="font-size: 2rem; font-weight: 700; color: var(--tallie-status-completed);">${outgoingCount}</div>
                    </div>
                  </div>
                </div>

                <h6 class="fw-bold mb-3" style="color: #0f172a;">Processing Efficiency Metrics</h6>
                <div class="d-flex flex-column gap-3 mb-4">
                  <div>
                    <div class="d-flex justify-content-between small mb-1">
                      <span style="font-weight: 500;">Dispatched &amp; Completed Rate</span>
                      <span class="fw-bold text-success">${Math.round(((s.archivedLetters || 0) / (s.totalLetters || 1)) * 100)}%</span>
                    </div>
                    <div class="progress" style="height: 8px; border-radius: 4px;">
                      <div class="progress-bar bg-success" style="width: ${Math.round(((s.archivedLetters || 0) / (s.totalLetters || 1)) * 100)}%"></div>
                    </div>
                  </div>

                  <div>
                    <div class="d-flex justify-content-between small mb-1">
                      <span style="font-weight: 500;">Under Active Review / Action</span>
                      <span class="fw-bold text-warning">${Math.round(((s.pendingCount || 0) / (s.totalLetters || 1)) * 100)}%</span>
                    </div>
                    <div class="progress" style="height: 8px; border-radius: 4px;">
                      <div class="progress-bar bg-warning" style="width: ${Math.round(((s.pendingCount || 0) / (s.totalLetters || 1)) * 100)}%"></div>
                    </div>
                  </div>
                </div>

                <div class="p-3 bg-light rounded border">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="mb-0 fw-bold" style="color: #0f172a;">Executive Summary Export</h6>
                      <small class="text-muted">Generate PDF summary for regional leadership</small>
                    </div>
                    <button class="tallie-btn tallie-btn-primary tallie-btn-sm" onclick="window.print()">
                      <img src="${ANIM_ICONS.download}" class="tallie-anim-icon tallie-anim-icon-btn" alt="Export" />
                      <span>Export Report</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-white border-top px-4 py-3">
                <button type="button" class="tallie-btn tallie-btn-outline" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('adminReportsModal')).show();
    } catch (err) {
      console.error('Error opening reports modal:', err);
    }
  }

  // Expose Global Engine API
  window.PortalEngine = {
    switchUser,
    switchNav,
    openLetterModal,
    openFullDocumentModal,
    openPrintView,
    openSignModal,
    executeAction,
    promptReturnForRevision,
    promptAssignDirectory,
    promptDelegateOfficer,
    submitMinute,
    loadLettersTable,
    openUsersModal,
    openAuditModal,
    openSettingsModal,
    openReportsModal,
    openComposeModal,
    openLetterDetailsSheet,
    closeDetailsSheet,
    exportCurrentLettersCsv
  };

})();
