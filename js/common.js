function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function roleTag(role) {
  return `<span class="role-tag ${escapeHtml(role)}">${escapeHtml(role)}</span>`;
}
