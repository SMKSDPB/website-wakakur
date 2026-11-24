
(function () {
  const client = window.supabaseClient;

  const message = document.getElementById("scheduleMessage");
  const content = document.getElementById("schedulePageContent");

  function showMessage(text, type = "info") {
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
      showMessage("Profil pengguna tidak ditemukan.", "error");
      return;
    }

    if (!profile.is_active) {
      showMessage("Akun Anda tidak aktif.", "error");
      return;
    }

    if (!["admin", "wakakur"].includes(profile.role)) {
      showMessage("Anda tidak memiliki akses ke halaman ini.", "error");
      return;
    }

    content.innerHTML = "<p>Memuat data tugas mengajar...</p>";

    const { data, error } = await client
      .from("teaching_assignments")
      .select(`
        id,
        academic_year,
        semester,
        hours_per_week,
        teachers (full_name),
        classes (class_name),
        subjects (subject_name)
      `)
      .order("academic_year", { ascending: false });

    if (error) {
      content.innerHTML = "";
      showMessage("Gagal mengambil data: " + error.message, "error");
      return;
    }

    if (!data || data.length === 0) {
      content.innerHTML = "<p>Belum ada data tugas mengajar.</p>";
      showMessage("Data berhasil diperiksa.", "success");
      return;
    }

    let rows = "";

    data.forEach((item, index) => {
      rows += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.teachers?.full_name || "-"}</td>
          <td>${item.classes?.class_name || "-"}</td>
          <td>${item.subjects?.subject_name || "-"}</td>
          <td>${item.hours_per_week || 0}</td>
          <td>${item.academic_year || "-"}</td>
          <td>${item.semester || "-"}</td>
        </tr>
      `;
    });

    content.innerHTML = `
      <h3>Daftar Tugas Mengajar</h3>
      <p>Data berikut akan digunakan sebagai dasar penyusunan jadwal.</p>

      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Guru</th>
              <th>Kelas</th>
              <th>Mata Pelajaran</th>
              <th>JP/Minggu</th>
              <th>Tahun Pelajaran</th>
              <th>Semester</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;

    showMessage(
      "Data tugas mengajar berhasil dimuat: " + data.length + " data.",
      "success"
    );
  }

  init();
})();
