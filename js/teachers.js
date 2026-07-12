const teacherForm = document.getElementById('teacher-form');
const teachersTableBody = document.getElementById('teachers-table-body');
const teachersEmpty = document.getElementById('teachers-empty');
const teacherFormTitle = document.getElementById('teacher-form-title');
const teacherSubmitBtn = document.getElementById('teacher-submit-btn');
const teacherCancelBtn = document.getElementById('teacher-cancel-btn');
const teacherIdField = document.getElementById('teacher-id');
const teacherProfileIdField = document.getElementById('teacher-profile-id');
const teacherNameField = document.getElementById('teacher-name');
const teacherEmailField = document.getElementById('teacher-email');
const teacherPasswordField = document.getElementById('teacher-password');
const teacherDepartmentField = document.getElementById('teacher-department');
const teacherTitleField = document.getElementById('teacher-title');

let teachersCache = [];

function renderTeachers() {
  if (!teachersTableBody) return;

  if (teachersCache.length === 0) {
    teachersTableBody.innerHTML = '';
    teachersEmpty.classList.remove('hidden');
    return;
  }
  teachersEmpty.classList.add('hidden');

  teachersTableBody.innerHTML = teachersCache.map(t => `
    <tr>
      <td>${escapeHtml(t.profiles && t.profiles.full_name)}</td>
      <td>${escapeHtml(t.profiles && t.profiles.email)}</td>
      <td>${escapeHtml(t.department)}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>
        <button class="btn-edit btn-small" onclick="editTeacher('${t.id}')">Edit</button>
        <button class="btn-danger btn-small" onclick="deleteUser('${t.profile_id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function loadTeachers() {
  const { data, error } = await sb
    .from('teachers')
    .select('id, profile_id, department, title, profiles(id, full_name, email)')
    .order('department');

  if (error) { console.error(error); return; }
  teachersCache = data;
  renderTeachers();
}

function resetTeacherForm() {
  teacherForm.reset();
  teacherIdField.value = '';
  teacherProfileIdField.value = '';
  teacherFormTitle.textContent = 'Add Teacher';
  teacherSubmitBtn.textContent = 'Add Teacher';
  teacherEmailField.disabled = false;
  teacherPasswordField.disabled = false;
  teacherCancelBtn.classList.add('hidden');
}

if (teacherForm) {
  teacherForm.addEventListener('submit', async e => {
    e.preventDefault();

    const editingId = teacherIdField.value;
    const fullName = teacherNameField.value.trim();
    const email = teacherEmailField.value.trim();
    const password = teacherPasswordField.value;
    const department = teacherDepartmentField.value.trim();
    const title = teacherTitleField.value.trim();

    if (editingId) {
      const profileId = teacherProfileIdField.value;

      const { error: profErr } = await sb.from('profiles').update({ full_name: fullName }).eq('id', profileId);
      if (profErr) { alert(profErr.message); return; }

      const { error: teachErr } = await sb.from('teachers')
        .update({ department, title })
        .eq('id', editingId);
      if (teachErr) { alert(teachErr.message); return; }
    } else {
      if (!password || password.length < 6) { alert('Password must be at least 6 characters.'); return; }

      const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
        email, password, email_confirm: true
      });
      if (createErr) { alert(createErr.message); return; }

      const newId = created.user.id;

      const { error: profErr } = await sbAdmin.from('profiles')
        .insert([{ id: newId, full_name: fullName, email, role: 'teacher' }]);
      if (profErr) { alert(profErr.message); return; }

      const { error: teachErr } = await sbAdmin.from('teachers')
        .insert([{ profile_id: newId, department, title }]);
      if (teachErr) { alert(teachErr.message); return; }
    }

    resetTeacherForm();
    loadTeachers();
    if (typeof loadUsers === 'function') loadUsers();
  });
}

window.editTeacher = function (id) {
  const t = teachersCache.find(x => x.id === id);
  if (!t) return;

  teacherIdField.value = t.id;
  teacherProfileIdField.value = t.profile_id;
  teacherNameField.value = t.profiles ? t.profiles.full_name : '';
  teacherEmailField.value = t.profiles ? t.profiles.email : '';
  teacherEmailField.disabled = true;
  teacherPasswordField.value = '';
  teacherPasswordField.disabled = true;
  teacherDepartmentField.value = t.department || '';
  teacherTitleField.value = t.title || '';
  teacherFormTitle.textContent = 'Edit Teacher';
  teacherSubmitBtn.textContent = 'Save Changes';
  teacherCancelBtn.classList.remove('hidden');
};

if (teacherCancelBtn) {
  teacherCancelBtn.addEventListener('click', resetTeacherForm);
}

if (teachersTableBody) {
  document.addEventListener('supabase-authed', e => {
    if (e.detail.role === 'admin') loadTeachers();
  });
}
