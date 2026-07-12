const profileForm = document.getElementById('profile-form');
const profileNameField = document.getElementById('profile-name');
const profileEmailField = document.getElementById('profile-email');
const profileRoleField = document.getElementById('profile-role');
const profileMessage = document.getElementById('profile-message');

function loadProfile(profile) {
  if (!profileForm) return;
  profileNameField.value = profile.full_name;
  profileEmailField.value = profile.email;
  profileRoleField.value = profile.role;
}

if (profileForm) {
  profileForm.addEventListener('submit', async e => {
    e.preventDefault();
    profileMessage.textContent = '';

    const { error } = await sb.from('profiles')
      .update({ full_name: profileNameField.value.trim() })
      .eq('id', window.currentUserProfile.id);

    if (error) { profileMessage.style.color = '#dc2626'; profileMessage.textContent = error.message; return; }

    window.currentUserProfile.full_name = profileNameField.value.trim();
    const sidebarName = document.getElementById('sidebar-name');
    if (sidebarName) sidebarName.textContent = window.currentUserProfile.full_name;

    profileMessage.style.color = '#166534';
    profileMessage.textContent = 'Profile updated.';
  });
}

if (profileForm) {
  document.addEventListener('supabase-authed', e => loadProfile(e.detail));
}
