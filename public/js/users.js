const usersTableBody = document.getElementById('users-table-body');
const usersEmpty = document.getElementById('users-empty');

const userEditCard = document.getElementById('user-edit-card');
const userEditForm = document.getElementById('user-edit-form');
const userEditId = document.getElementById('user-edit-id');
const userEditName = document.getElementById('user-edit-name');
const userEditRole = document.getElementById('user-edit-role');
const userEditCancel = document.getElementById('user-edit-cancel');

let usersCache = [];

function renderUsers() {
  if (!usersTableBody) return;

  if (usersCache.length === 0) {
    usersTableBody.innerHTML = '';
    usersEmpty.classList.remove('hidden');
    return;
  }
  usersEmpty.classList.add('hidden');

  usersTableBody.innerHTML = usersCache.map(u => `
    <tr>
      <td>${escapeHtml(u.full_name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${roleTag(u.role)}</td>
      <td>
        <button class="btn-edit btn-small" onclick="editUser('${u.id}')">Edit</button>
        <button class="btn-secondary btn-small" onclick="resetUserPassword('${u.id}', '${escapeHtml(u.email)}')">Reset Password</button>
        <button class="btn-danger btn-small" onclick="deleteUser('${u.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function loadUsers() {
  const { data, error } = await sb.from('profiles').select('*').order('full_name');
  if (error) { console.error(error); return; }
  usersCache = data;
  renderUsers();
}

window.editUser = function (id) {
  const u = usersCache.find(x => x.id === id);
  if (!u) return;
  userEditId.value = u.id;
  userEditName.value = u.full_name;
  userEditRole.value = u.role;
  userEditCard.classList.remove('hidden');
};

if (userEditCancel) {
  userEditCancel.addEventListener('click', () => {
    userEditCard.classList.add('hidden');
    userEditForm.reset();
  });
}

if (userEditForm) {
  userEditForm.addEventListener('submit', async e => {
    e.preventDefault();

    const { error } = await sb.from('profiles').update({
      full_name: userEditName.value.trim(),
      role: userEditRole.value
    }).eq('id', userEditId.value);

    if (error) { alert(error.message); return; }

    userEditCard.classList.add('hidden');
    userEditForm.reset();
    loadUsers();
  });
}

window.resetUserPassword = async function (id, email) {
  const newPassword = prompt(`New password for ${email}:`);
  if (!newPassword) return;
  if (newPassword.length < 6) { alert('Password must be at least 6 characters.'); return; }

  const { error } = await sbAdmin.auth.admin.updateUserById(id, { password: newPassword });
  if (error) { alert(error.message); return; }
  alert('Password updated.');
};

window.deleteUser = async function (id) {
  if (!confirm('Delete this user account? This permanently removes their login and all related records.')) return;

  const { error } = await sbAdmin.auth.admin.deleteUser(id);
  if (error) { alert(error.message); return; }

  loadUsers();
  if (typeof loadStudents === 'function') loadStudents();
  if (typeof loadTeachers === 'function') loadTeachers();
  if (typeof loadEnrollments === 'function') loadEnrollments();
};

if (usersTableBody) {
  document.addEventListener('supabase-authed', e => {
    if (e.detail.role === 'admin') loadUsers();
  });
}
