const navButtons = document.querySelectorAll('.nav-btn');
const pagePanels = document.querySelectorAll('.page-panel');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    pagePanels.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
  });
});
