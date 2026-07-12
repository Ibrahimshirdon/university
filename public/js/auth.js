// Runs on both login.html and index.html

const loginBtn = document.getElementById('login-btn');
const errorBox = document.getElementById('error-box');

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    errorBox.textContent = '';

    if (!email || !password) { errorBox.textContent = 'Enter an email and password.'; return; }

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { errorBox.textContent = error.message; return; }
    window.location.href = 'index.html';
  });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'login.html';
  });
}

// Route guard: keep users off pages they shouldn't see
const onLoginPage = !!document.getElementById('login-btn');
const onDashboard = !!document.getElementById('logout-btn');

function applyRoleUI() {
  const role = window.currentUserProfile ? window.currentUserProfile.role : null;

  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'admin');
  });

  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',').map(r => r.trim());
    el.classList.toggle('hidden', !allowed.includes(role));
  });
}

async function handleSession(session) {
  if (session) {
    if (onLoginPage) window.location.href = 'index.html';
    if (onDashboard) {
      const { data: profile, error } = await sb
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        errorBox && (errorBox.textContent = 'No profile found for this account. Ask an admin to set one up.');
        await sb.auth.signOut();
        window.location.href = 'login.html';
        return;
      }

      window.currentUserProfile = profile;

      const nameEl = document.getElementById('sidebar-name');
      const roleEl = document.getElementById('sidebar-role-badge');
      if (nameEl) nameEl.textContent = profile.full_name;
      if (roleEl) roleEl.textContent = profile.role;

      applyRoleUI();
      document.dispatchEvent(new CustomEvent('supabase-authed', { detail: profile }));
    }
  } else {
    if (onDashboard) window.location.href = 'login.html';
  }
}

sb.auth.getSession().then(({ data }) => handleSession(data.session));
sb.auth.onAuthStateChange((_event, session) => handleSession(session));
