const studentForm = document.getElementById('student-form');
const studentsTableBody = document.getElementById('students-table-body');
const studentsEmpty = document.getElementById('students-empty');
const studentFormTitle = document.getElementById('student-form-title');
const studentSubmitBtn = document.getElementById('student-submit-btn');
const studentCancelBtn = document.getElementById('student-cancel-btn');
const studentIdField = document.getElementById('student-id');
const studentProfileIdField = document.getElementById('student-profile-id');
const studentNameField = document.getElementById('student-name');
const studentEmailField = document.getElementById('student-email');
const studentPasswordField = document.getElementById('student-password');
const studentNumberField = document.getElementById('student-number');
const studentDepartmentField = document.getElementById('student-department');

let studentsCache = [];

function renderStudents() {
  if (!studentsTableBody) return;

  if (studentsCache.length === 0) {
    studentsTableBody.innerHTML = '';
    studentsEmpty.classList.remove('hidden');
    return;
  }
  studentsEmpty.classList.add('hidden');

  const isAdmin = window.currentUserProfile && window.currentUserProfile.role === 'admin';

  studentsTableBody.innerHTML = studentsCache.map(s => `
    <tr>
      <td>${escapeHtml(s.profiles && s.profiles.full_name)}</td>
      <td>${escapeHtml(s.profiles && s.profiles.email)}</td>
      <td>${escapeHtml(s.student_number)}</td>
      <td>${escapeHtml(s.department)}</td>
      <td>
        ${isAdmin ? `
          <button class="btn-edit btn-small" onclick="editStudent('${s.id}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteUser('${s.profile_id}')">Delete</button>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

async function loadStudents() {
  const { data, error } = await sb
    .from('students')
    .select('id, profile_id, student_number, department, profiles(id, full_name, email)')
    .order('student_number');

  if (error) { console.error(error); return; }
  studentsCache = data;
  renderStudents();
  if (typeof populateStudentDropdown === 'function') populateStudentDropdown(studentsCache);
}

function resetStudentForm() {
  studentForm.reset();
  studentIdField.value = '';
  studentProfileIdField.value = '';
  studentFormTitle.textContent = 'Add Student';
  studentSubmitBtn.textContent = 'Add Student';
  studentEmailField.disabled = false;
  studentPasswordField.disabled = false;
  studentCancelBtn.classList.add('hidden');
}

if (studentForm) {
  studentForm.addEventListener('submit', async e => {
    e.preventDefault();

    const editingId = studentIdField.value;
    const fullName = studentNameField.value.trim();
    const email = studentEmailField.value.trim();
    const password = studentPasswordField.value;
    const studentNumber = studentNumberField.value.trim();
    const department = studentDepartmentField.value.trim();

    if (editingId) {
      const profileId = studentProfileIdField.value;

      const { error: profErr } = await sb.from('profiles').update({ full_name: fullName }).eq('id', profileId);
      if (profErr) { alert(profErr.message); return; }

      const { error: stuErr } = await sb.from('students')
        .update({ student_number: studentNumber, department })
        .eq('id', editingId);
      if (stuErr) { alert(stuErr.message); return; }
    } else {
      if (!password || password.length < 6) { alert('Password must be at least 6 characters.'); return; }

      const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
        email, password, email_confirm: true
      });
      if (createErr) { alert(createErr.message); return; }

      const newId = created.user.id;

      const { error: profErr } = await sbAdmin.from('profiles')
        .insert([{ id: newId, full_name: fullName, email, role: 'student' }]);
      if (profErr) { alert(profErr.message); return; }

      const { error: stuErr } = await sbAdmin.from('students')
        .insert([{ profile_id: newId, student_number: studentNumber, department }]);
      if (stuErr) { alert(stuErr.message); return; }
    }

    resetStudentForm();
    loadStudents();
    if (typeof loadUsers === 'function') loadUsers();
  });
}

window.editStudent = function (id) {
  const s = studentsCache.find(x => x.id === id);
  if (!s) return;

  studentIdField.value = s.id;
  studentProfileIdField.value = s.profile_id;
  studentNameField.value = s.profiles ? s.profiles.full_name : '';
  studentEmailField.value = s.profiles ? s.profiles.email : '';
  studentEmailField.disabled = true;
  studentPasswordField.value = '';
  studentPasswordField.disabled = true;
  studentNumberField.value = s.student_number || '';
  studentDepartmentField.value = s.department || '';
  studentFormTitle.textContent = 'Edit Student';
  studentSubmitBtn.textContent = 'Save Changes';
  studentCancelBtn.classList.remove('hidden');
};

if (studentCancelBtn) {
  studentCancelBtn.addEventListener('click', resetStudentForm);
}

if (studentsTableBody) {
  document.addEventListener('supabase-authed', e => {
    if (['admin', 'teacher', 'student'].includes(e.detail.role)) loadStudents();
  });
}
