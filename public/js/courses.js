const courseForm = document.getElementById('course-form');
const coursesTableBody = document.getElementById('courses-table-body');
const coursesEmpty = document.getElementById('courses-empty');
const courseFormTitle = document.getElementById('course-form-title');
const courseSubmitBtn = document.getElementById('course-submit-btn');
const courseIdField = document.getElementById('course-id');

let coursesCache = [];

function renderCourses() {
  if (!coursesTableBody) return;

  if (coursesCache.length === 0) {
    coursesTableBody.innerHTML = '';
    coursesEmpty.classList.remove('hidden');
    return;
  }
  coursesEmpty.classList.add('hidden');

  const isAdmin = window.currentUserProfile && window.currentUserProfile.role === 'admin';

  coursesTableBody.innerHTML = coursesCache.map(c => `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(String(c.credits))}</td>
      <td>${escapeHtml(c.instructor)}</td>
      <td>
        ${isAdmin ? `
          <button class="btn-edit btn-small" onclick="editCourse('${c.id}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteCourse('${c.id}')">Delete</button>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

async function loadCourses() {
  const { data, error } = await sb.from('courses').select('*').order('name');
  if (error) { console.error(error); return; }
  coursesCache = data;
  renderCourses();
  if (typeof populateCourseDropdown === 'function') populateCourseDropdown(coursesCache);
}

if (courseForm) {
  courseForm.addEventListener('submit', async e => {
    e.preventDefault();

    const data = {
      name: document.getElementById('course-name').value.trim(),
      code: document.getElementById('course-code').value.trim(),
      credits: Number(document.getElementById('course-credits').value),
      instructor: document.getElementById('course-instructor').value.trim()
    };

    const editingId = courseIdField.value;

    const { error } = editingId
      ? await sb.from('courses').update(data).eq('id', editingId)
      : await sb.from('courses').insert([data]);

    if (error) { alert(error.message); return; }

    courseForm.reset();
    courseIdField.value = '';
    courseFormTitle.textContent = 'Add Course';
    courseSubmitBtn.textContent = 'Add Course';
    loadCourses();
  });
}

window.editCourse = function (id) {
  const c = coursesCache.find(x => x.id === id);
  if (!c) return;
  document.getElementById('course-id').value = c.id;
  document.getElementById('course-name').value = c.name;
  document.getElementById('course-code').value = c.code;
  document.getElementById('course-credits').value = c.credits;
  document.getElementById('course-instructor').value = c.instructor;
  courseFormTitle.textContent = 'Edit Course';
  courseSubmitBtn.textContent = 'Save Changes';
};

window.deleteCourse = async function (id) {
  if (!confirm('Delete this course? This will also remove existing enrollment records.')) return;
  const { error } = await sb.from('courses').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  loadCourses();
  if (typeof loadEnrollments === 'function') loadEnrollments();
};

if (coursesTableBody) {
  document.addEventListener('supabase-authed', loadCourses);
}
