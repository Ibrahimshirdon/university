const dashboardCards = document.getElementById('dashboard-cards');

function statCardHtml(value, label) {
  return `
    <div class="stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>
  `;
}

async function countRows(table) {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (error) { console.error(error); return 0; }
  return count ?? 0;
}

async function loadDashboard(profile) {
  if (!dashboardCards) return;

  if (profile.role === 'admin') {
    const [students, teachers, courses, enrollments] = await Promise.all([
      countRows('students'), countRows('teachers'), countRows('courses'), countRows('enrollments')
    ]);
    dashboardCards.innerHTML =
      statCardHtml(students, 'Total Students') +
      statCardHtml(teachers, 'Total Teachers') +
      statCardHtml(courses, 'Total Courses') +
      statCardHtml(enrollments, 'Total Enrollments');
  } else if (profile.role === 'teacher') {
    const [students, courses, enrollments] = await Promise.all([
      countRows('students'), countRows('courses'), countRows('enrollments')
    ]);
    dashboardCards.innerHTML =
      statCardHtml(students, 'Total Students') +
      statCardHtml(courses, 'Total Courses') +
      statCardHtml(enrollments, 'Total Enrollments');
  } else {
    const [courses, enrollments] = await Promise.all([
      countRows('courses'), countRows('enrollments')
    ]);
    dashboardCards.innerHTML =
      statCardHtml(courses, 'Available Courses') +
      statCardHtml(enrollments, 'My Enrollments');
  }
}

if (dashboardCards) {
  document.addEventListener('supabase-authed', e => loadDashboard(e.detail));
}
