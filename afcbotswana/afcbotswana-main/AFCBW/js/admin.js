/* ============================================================
   AFC BOTSWANA — ADMIN JS
   Login: Firebase Auth (email + password)
   All data operations unchanged — still go through data.js → Firebase
   ============================================================ */

import { DB } from './data.js';
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  ROLE_EMAILS
} from '../camp/camp-firebase.js';

/* ══════════════════════════════════════════════════════════
   AUTH — Firebase replaces hardcoded ADMIN_PASS
   Only the mainsite email is allowed in.
   All other Firebase accounts (camp manager, store, secretary)
   are redirected away so they can't access the main site admin.
══════════════════════════════════════════════════════════ */

// Watch auth state on page load
onAuthStateChanged(auth, async (user) => {
  if (user && user.email.toLowerCase() === ROLE_EMAILS.mainsite) {
    // Valid main site admin — show panel
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display    = 'flex';
    document.getElementById('adminEmailDisplay').textContent = user.email;
    await initAdminApp();
  } else if (user) {
    // Logged in but wrong account (camp admin etc.)
    await signOut(auth);
    showLoginMsg('This account does not have access to the main site admin.', 'error');
  }
  // If no user — login screen stays visible (default)
});

window.doLogin = async function() {
  const btn   = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const pwd   = document.getElementById('loginPassword').value;
  clearLoginMsg();

  if(!email || !pwd) {
    showLoginMsg('Please enter your email address and password.', 'error');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Logging in…';

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pwd);

    // Only allow the designated mainsite admin email
    if(cred.user.email.toLowerCase() !== ROLE_EMAILS.mainsite) {
      await signOut(auth);
      showLoginMsg('This account does not have access to the main site admin.', 'error');
      btn.disabled    = false;
      btn.textContent = 'Login →';
      return;
    }
    // onAuthStateChanged above will handle the redirect into the app

  } catch(err) {
    const msgs = {
      'auth/user-not-found':        'No account found with this email address.',
      'auth/wrong-password':        'Incorrect password. Please try again.',
      'auth/invalid-email':         'Please enter a valid email address.',
      'auth/invalid-credential':    'Incorrect email or password.',
      'auth/too-many-requests':     'Too many failed attempts. Please wait a few minutes.',
      'auth/network-request-failed':'Network error — please check your connection.',
    };
    showLoginMsg(msgs[err.code] || 'Login failed. Please check your credentials.', 'error');
  }

  btn.disabled    = false;
  btn.textContent = 'Login →';
};

window.doLogout = async function() {
  try {
    await signOut(auth);
    // Reload so the login screen shows cleanly
    window.location.reload();
  } catch(e) {
    console.error('Logout error:', e);
    window.location.reload();
  }
};

window.doForgotPassword = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  clearLoginMsg();

  if(!email) {
    showLoginMsg('Please enter your email address above, then click "Forgot password?"', 'error');
    return;
  }

  const btn = document.getElementById('forgotBtn');
  btn.textContent = 'Sending…';
  btn.disabled    = true;

  try {
    await sendPasswordResetEmail(auth, email);
    showLoginMsg(`Password reset email sent to ${email} — check your inbox.`, 'success');
  } catch(err) {
    const msgs = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/invalid-email':  'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many requests. Please wait before trying again.',
    };
    showLoginMsg(msgs[err.code] || 'Could not send reset email. Please try again.', 'error');
  }

  btn.textContent = 'Forgot password?';
  btn.disabled    = false;
};

function showLoginMsg(msg, type) {
  const el = document.getElementById('loginMsg');
  el.textContent  = msg;
  el.className    = `login-msg ${type}`;
  el.style.display = 'block';
}

function clearLoginMsg() {
  const el = document.getElementById('loginMsg');
  el.style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   APP INIT
   Everything below is unchanged from original admin.js —
   all data operations already use Firebase via data.js
══════════════════════════════════════════════════════════ */

async function initAdminApp() {
  setupSidebarNav();
  await Promise.all([
    loadDashboard(),
    loadEvents(),
    loadContent(),
    loadRegistrations(),
    loadGallery(),
  ]);
}

function updateClock() {
  const el = document.getElementById('adminDateTime');
  if(el) el.textContent = new Date().toLocaleString('en-BW', {
    weekday:'long', year:'numeric', month:'long',
    day:'numeric', hour:'2-digit', minute:'2-digit'
  });
}
updateClock();
setInterval(updateClock, 60000);

/* ---------- SIDEBAR NAV ---------- */
function setupSidebarNav() {
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });
}

async function switchTab(tabName) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(l => l.classList.remove('active'));
  const tab  = document.getElementById('tab-' + tabName);
  const link = document.querySelector(`.sidebar-link[data-tab="${tabName}"]`);
  if(tab)  tab.classList.add('active');
  if(link) link.classList.add('active');
  const titles = {
    dashboard:'Dashboard', events:'Events',
    content:'Site Content', registrations:'Registrations', gallery:'Gallery'
  };
  setEl('adminPageTitle', titles[tabName] || tabName);
  if(tabName === 'dashboard')     await loadDashboard();
  if(tabName === 'events')        await loadEvents();
  if(tabName === 'content')       await loadContent();
  if(tabName === 'registrations') await loadRegistrations();
  if(tabName === 'gallery')       await loadGallery();
}

/* ---------- DASHBOARD ---------- */
async function loadDashboard() {
  const events = await DB.getEvents();
  const regs   = await DB.getRegistrations();
  setEl('statEvents', events.length);
  setEl('statRegistrations', regs.length);

  const recent = document.getElementById('dashRecentEvents');
  if(!recent) return;
  if(!events.length) {
    recent.innerHTML = '<p style="color:#aab0c0;font-size:.88rem;">No events yet.</p>';
    return;
  }
  recent.innerHTML = events.slice(-3).reverse().map(ev => `
    <div class="admin-event-item">
      <div class="admin-event-item-title">${escHtml(ev.name)}</div>
      <div class="admin-event-item-meta">📅 ${formatDate(ev.date)} · 📍 ${escHtml(ev.location)}</div>
    </div>`).join('');
}

/* ---------- EVENTS ---------- */
async function loadEvents() {
  await renderAdminEventsList();
}

async function renderAdminEventsList() {
  const events = await DB.getEvents();
  const list   = document.getElementById('adminEventsList');
  if(!list) return;
  if(!events.length) {
    list.innerHTML = '<p class="empty-state">No events yet. Add your first event above.</p>';
    return;
  }
  list.innerHTML = events
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .map(ev => `
      <div class="admin-event-item">
        <div class="admin-event-item-title">${escHtml(ev.name)}</div>
        <div class="admin-event-item-meta">
          📅 ${formatDate(ev.date)} at ${formatTime(ev.time)}<br>
          📍 ${escHtml(ev.location)}
        </div>
        <div class="admin-event-item-actions">
          <button class="btn-edit"   onclick="editEvent('${ev.id}')">✏ Edit</button>
          <button class="btn-delete" onclick="deleteEvent('${ev.id}')">✕ Delete</button>
        </div>
      </div>`).join('');
}

async function saveEvent() {
  const id   = document.getElementById('editingEventId').value;
  const data = {
    name:        document.getElementById('evtName').value.trim(),
    date:        document.getElementById('evtDate').value,
    time:        document.getElementById('evtTime').value,
    location:    document.getElementById('evtLocation').value.trim(),
    description: document.getElementById('evtDesc').value.trim(),
    poster:      document.getElementById('evtPoster').value.trim(),
  };
  if(!data.name || !data.date || !data.time || !data.location) {
    showToast('Please fill in all required fields.', 'error'); return;
  }
  try {
    if(id) {
      await DB.updateEvent(id, data);
      showToast('✓ Event updated in Firebase.', 'success');
    } else {
      await DB.addEvent(data);
      showToast('✓ Event added to Firebase!', 'success');
    }
    clearEventForm();
    await renderAdminEventsList();
    await loadDashboard();
  } catch(e) {
    console.error(e);
    showToast('Firebase save failed: ' + e.message, 'error');
  }
}

async function editEvent(id) {
  const ev = (await DB.getEvents()).find(e => e.id === id);
  if(!ev) return;
  document.getElementById('editingEventId').value = ev.id;
  document.getElementById('evtName').value         = ev.name;
  document.getElementById('evtDate').value         = ev.date;
  document.getElementById('evtTime').value         = ev.time;
  document.getElementById('evtLocation').value     = ev.location;
  document.getElementById('evtDesc').value         = ev.description || '';
  document.getElementById('evtPoster').value       = ev.poster      || '';
  setEl('eventFormTitle', 'Edit Event');
  document.getElementById('tab-events').scrollTo(0,0);
}

function clearEventForm() {
  document.getElementById('editingEventId').value = '';
  ['evtName','evtDate','evtTime','evtLocation','evtDesc','evtPoster']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  setEl('eventFormTitle', 'Add New Event');
}

async function deleteEvent(id) {
  if(!confirm('Delete this event? This cannot be undone.')) return;
  try {
    await DB.deleteEvent(id);
    showToast('Event deleted from Firebase.', 'success');
    await renderAdminEventsList();
    await loadDashboard();
  } catch(e) {
    console.error(e);
    showToast('Firebase delete failed: ' + e.message, 'error');
  }
}

async function migrateLegacyEvents() {
  try {
    const count = await DB.migrateLegacyEvents();
    await renderAdminEventsList();
    await loadDashboard();
    showToast(
      count
        ? `✓ Imported ${count} old event${count === 1 ? '' : 's'} to Firebase.`
        : 'No old browser events found to import.',
      'success'
    );
  } catch(e) {
    console.error(e);
    showToast('Import failed: ' + e.message, 'error');
  }
}

/* ---------- CONTENT ---------- */
async function loadContent() {
  const cfg = await DB.getConfig();
  document.getElementById('cfgHeroTitle').value    = cfg.hero_title    || '';
  document.getElementById('cfgWeeklyVerse').value  = cfg.weekly_verse  || '';
  document.getElementById('cfgAboutText').value    = cfg.about_text    || '';
  document.getElementById('cfgEmail').value        = cfg.contact_email || '';
  document.getElementById('cfgPhone').value        = cfg.contact_phone || '';
}

async function saveContent() {
  const cfg = {
    hero_title:    document.getElementById('cfgHeroTitle').value.trim(),
    weekly_verse:  document.getElementById('cfgWeeklyVerse').value.trim(),
    about_text:    document.getElementById('cfgAboutText').value.trim(),
    contact_email: document.getElementById('cfgEmail').value.trim(),
    contact_phone: document.getElementById('cfgPhone').value.trim(),
  };
  try {
    await DB.saveConfig(cfg);
    showToast('✓ Content saved! Changes will appear on the website.', 'success');
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

/* ---------- REGISTRATIONS ---------- */
async function loadRegistrations() {
  const regs      = await DB.getRegistrations();
  const container = document.getElementById('registrationsTable');
  if(!container) return;
  if(!regs.length) {
    container.innerHTML = '<p class="empty-state">No registrations yet.</p>';
    return;
  }
  container.innerHTML = `
    <table class="reg-table">
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>Phone</th>
          <th>Branch</th><th>Event</th><th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${regs.map(r => `
          <tr>
            <td>${escHtml(r.name)}</td>
            <td>${escHtml(r.email)}</td>
            <td>${escHtml(r.phone)}</td>
            <td>${escHtml(r.branch || '—')}</td>
            <td>${escHtml(r.event_name)}</td>
            <td>${r.created ? new Date(r.created).toLocaleDateString('en-BW') : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function exportRegistrations() {
  const regs = await DB.getRegistrations();
  if(!regs.length) { showToast('No registrations to export.', 'error'); return; }
  const header = ['Name','Email','Phone','Branch','Event','Date'];
  const rows   = regs.map(r => [
    r.name, r.email, r.phone, r.branch || '', r.event_name,
    r.created ? new Date(r.created).toLocaleDateString('en-BW') : ''
  ]);
  const csv  = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  a.download = `afco_registrations_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('✓ Registrations exported as CSV.', 'success');
}

/* ---------- GALLERY ---------- */
async function loadGallery() {
  await renderGalleryAdmin();
}

async function addGalleryPhoto() {
  const url     = document.getElementById('galleryUrl').value.trim();
  const caption = document.getElementById('galleryCaption').value.trim();
  if(!url) { showToast('Please enter a photo URL.', 'error'); return; }
  try {
    await DB.addGalleryItem({ url, caption });
    document.getElementById('galleryUrl').value     = '';
    document.getElementById('galleryCaption').value = '';
    await renderGalleryAdmin();
    showToast('✓ Photo added to gallery!', 'success');
  } catch(e) {
    showToast('Failed to add photo: ' + e.message, 'error');
  }
}

async function renderGalleryAdmin() {
  const gallery = await DB.getGallery();
  const list    = document.getElementById('galleryAdminList');
  if(!list) return;
  if(!gallery.length) {
    list.innerHTML = '<p class="empty-state">No photos yet.</p>';
    return;
  }
  list.innerHTML = gallery.map(item => `
    <div class="gallery-admin-item">
      <img src="${item.url}" alt="${escHtml(item.caption)}"
        onerror="this.style.background='#eef1f7'"/>
      <div class="gallery-admin-item-info">
        <p>${escHtml(item.caption || 'Untitled')}</p>
        <span>${item.url.length > 50 ? item.url.slice(0,50)+'…' : item.url}</span>
      </div>
      <button class="btn-delete"
        style="padding:.4rem .8rem;font-size:.8rem;border:none;border-radius:5px;cursor:pointer;background:#fef2f2;color:#dc2626;font-weight:700;"
        onclick="removeGalleryPhoto('${item.id}')">✕</button>
    </div>`).join('');
}

async function removeGalleryPhoto(id) {
  if(!confirm('Remove this photo?')) return;
  try {
    await DB.deleteGalleryItem(id);
    await renderGalleryAdmin();
    showToast('Photo removed.', 'success');
  } catch(e) {
    showToast('Failed to remove photo: ' + e.message, 'error');
  }
}

/* ---------- UTILS ---------- */
function setEl(id, val) {
  const el = document.getElementById(id);
  if(el) el.textContent = val;
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if(!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BW', {
      day:'numeric', month:'long', year:'numeric'
    });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  if(!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true });
  } catch { return timeStr; }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 4000);
}

/* ---------- EXPOSE TO HTML onclick attributes ---------- */
window.switchTab          = switchTab;
window.saveEvent          = saveEvent;
window.editEvent          = editEvent;
window.clearEventForm     = clearEventForm;
window.deleteEvent        = deleteEvent;
window.migrateLegacyEvents= migrateLegacyEvents;
window.saveContent        = saveContent;
window.exportRegistrations= exportRegistrations;
window.addGalleryPhoto    = addGalleryPhoto;
window.removeGalleryPhoto = removeGalleryPhoto;