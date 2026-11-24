
(function () {
  const client = window.supabaseClient;

  const message = document.getElementById("scheduleMessage");
  const content = document.getElementById("schedulePageContent");

  function showMessage(text, type = "info") {
    if (!message) return;

    message.textContent = text;
    message.className = `message ${type}`;
  }

  function redirectToLogin() {
    window.location.replace("admin.html");
  }

  async function init() {
    if (!client) {
      redirectToLogin();
      return;
    }

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError || !sessionData.session) {
      redirectToLogin();
      return;
    }

    const user = sessionData.session.user;

    const { data: profile, error: profileError } = await client
  .from("profiles")
  .select("role, is_active")
  .eq("user_id", user.id)
  .single();

    if (profileError || !profile) {
  showMessage("Profil pengguna tidak ditemukan: " + (profileError?.message || ""), "error");
  return;
}

if (!profile.is_active) {
  showMessage("Akun Anda tidak aktif.", "error");
  return;
}

    if (!["admin", "wakakur"].includes(profile.role)) {
      showMessage("Anda tidak memiliki akses ke halaman ini.", "error");
      setTimeout(() => {
        window.location.replace("dashboard-admin.html");
      }, 1500);
      return;
    }

    content.innerHTML = `
      <h3>Persiapan Manajemen Jadwal</h3>
      <p>Pengguna berhasil diverifikasi.</p>
      <p>Selanjutnya kita akan menghubungkan data tugas mengajar
      dengan tabel jadwal pembelajaran.</p>
    `;

    showMessage("Akses berhasil diverifikasi.", "success");
  }

  init();
})();
