const enrollmentForm = document.getElementById('enrollment-form');
const enrollStudentSelect = document.getElementById('enroll-student');
const enrollCourseSelect = document.getElementById('enroll-course');
const enrollmentTableBody = document.getElementById('enrollment-table-body');
const enrollmentEmpty = document.getElementById('enrollment-empty');
const enrollmentsHeading = document.getElementById('enrollments-heading');

let enrollmentsCache = [];

function populateStudentDropdown(students) {
  if (!enrollStudentSelect) return;
  const current = enrollStudentSelect.value;
  enrollStudentSelect.innerHTML = '<option value="">Select Student</option>' +
    students.map(s => {
      const name = s.profiles ? s.profiles.full_name : 'Unknown';
      return `<option value="${s.id}">${escapeHtml(name)} (${escapeHtml(s.student_number)})</option>`;
    }).join('');
  enrollStudentSelect.value = current;
}

function populateCourseDropdown(courses) {
  if (!enrollCourseSelect) return;
  const current = enrollCourseSelect.value;
  enrollCourseSelect.innerHTML = '<option value="">Select Course</option>' +
    courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`).join('');
  enrollCourseSelect.value = current;
}

function renderEnrollments() {
  if (!enrollmentTableBody) return;

  if (enrollmentsCache.length === 0) {
    enrollmentTableBody.innerHTML = '';
    enrollmentEmpty.classList.remove('hidden');
    return;
  }
  enrollmentEmpty.classList.add('hidden');

  const isAdmin = window.currentUserProfile && window.currentUserProfile.role === 'admin';

  enrollmentTableBody.innerHTML = enrollmentsCache.map(e => {
    const date = e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '-';
    return `
      <tr>
        <td>${escapeHtml(e.student_name)}</td>
        <td>${escapeHtml(e.course_name)}</td>
        <td>${date}</td>
        <td>${isAdmin ? `<button class="btn-danger btn-small" onclick="deleteEnrollment('${e.id}')">Unenroll</button>` : '-'}</td>
      </tr>
    `;
  }).join('');
}

async function loadEnrollments() {
  const { data, error } = await sb.from('enrollments').select('*').order('enrolled_at', { ascending: false });
  if (error) { console.error(error); return; }
  enrollmentsCache = data;
  renderEnrollments();
}

if (enrollmentForm) {
  enrollmentForm.addEventListener('submit', async e => {
    e.preventDefault();

    const studentId = enrollStudentSelect.value;
    const courseId = enrollCourseSelect.value;
    if (!studentId || !courseId) return;

    const alreadyEnrolled = enrollmentsCache.some(en => en.student_id === studentId && en.course_id === courseId);
    if (alreadyEnrolled) {
      alert('This student is already enrolled in this course.');
      return;
    }

    const student = studentsCache.find(s => s.id === studentId);
    const course = coursesCache.find(c => c.id === courseId);

    const { error } = await sb.from('enrollments').insert([{
      student_id: studentId,
      course_id: courseId,
      student_name: student && student.profiles ? student.profiles.full_name : 'Unknown',
      course_name: course ? course.name : 'Unknown'
    }]);

    if (error) { alert(error.message); return; }

    enrollmentForm.reset();
    loadEnrollments();
  });
}

window.deleteEnrollment = async function (id) {
  if (!confirm('Remove this enrollment record?')) return;
  const { error } = await sb.from('enrollments').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  loadEnrollments();
};

if (enrollmentTableBody) {
  document.addEventListener('supabase-authed', e => {
    if (enrollmentsHeading) {
      enrollmentsHeading.textContent = e.detail.role === 'student' ? 'My Enrollments' : 'Enrollments';
    }
    loadEnrollments();
  });
}
