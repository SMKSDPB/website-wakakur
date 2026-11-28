
(function () {
  const client = window.supabaseClient;

  const loginForm = document.getElementById("teacherLoginForm");
  const loginMessage = document.getElementById("teacherLoginMessage");
  const loginButton = document.getElementById("teacherLoginButton");

  const teacherPanel = document.getElementById("teacherPanel");
  const teacherWelcome = document.getElementById("teacherWelcome");
  const logoutButton = document.getElementById("teacherLogoutButton");

  const scheduleMessage = document.getElementById("teacherScheduleMessage");
  const scheduleContent = document.getElementById("teacherScheduleContent");

  const days = [
    "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
  ];

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function showLoginMessage(text, type = "info") {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
  }

  function showScheduleMessage(text, type = "info") {
    scheduleMessage.textContent = text;
    scheduleMessage.className = `message ${type}`;
  }

  function getTime(value) {
    return String(value || "").slice(0, 5);
  }

  function showLoggedIn() {
    loginForm.closest(".card").hidden = true;
    teacherPanel.hidden = false;
  }

  function showLoggedOut() {
    loginForm.closest(".card").hidden = false;
    teacherPanel.hidden = true;
    loginForm.reset();
    scheduleContent.innerHTML = "";
  }

  // Memeriksa role dan status akun.
  async function verifyGuru(userId) {
    const { data: profile, error } = await client
      .from("profiles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!profile || !profile.is_active) {
      throw new Error("Akun tidak aktif atau profil tidak ditemukan.");
    }

    if (profile.role !== "guru") {
      throw new Error("Halaman ini khusus untuk akun Guru.");
    }

    return profile;
  }

  async function loadTeacherSchedules() {
    showScheduleMessage("Memuat jadwal mengajar...");
    scheduleContent.innerHTML = "<p>Mohon tunggu...</p>";

    try {
      const { data, error } = await client
        .from("teacher_own_schedules")
        .select("*");

      if (error) throw error;

      const schedules = data || [];

      if (!schedules.length) {
        showScheduleMessage(
          "Belum ada jadwal mengajar yang terdaftar.",
          "success"
        );
        scheduleContent.innerHTML = "";
        teacherWelcome.textContent = "Jadwal Mengajar Guru";
        return;
      }

      teacherWelcome.textContent =
        "Jadwal Mengajar - " + schedules[0].teacher_name;

      schedules.sort((a, b) =>
        days.indexOf(a.day_name) - days.indexOf(b.day_name) ||
        getTime(a.start_time).localeCompare(getTime(b.start_time))
      );

      scheduleContent.innerHTML = days.map(day => {
        const daySchedules = schedules.filter(
          item => item.day_name === day
        );

        if (!daySchedules.length) return "";

        return `
          <section class="card" style="margin-top:20px;">
            <h3>${escapeHTML(day)}</h3>

            <div style="overflow-x:auto;">
              <table>
                <thead>
                  <tr>
                    <th>Jam</th>
                    <th>Kelas</th>
                    <th>Mata Pelajaran</th>
                    <th>Ruangan</th>
                    <th>Tahun Pelajaran</th>
                    <th>Semester</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${daySchedules.map(item => `
                    <tr>
                      <td>
                        ${escapeHTML(getTime(item.start_time))}
                        -
                        ${escapeHTML(getTime(item.end_time))}
                      </td>
                      <td>${escapeHTML(item.class_name || "-")}</td>
                      <td>${escapeHTML(item.subject_name || "-")}</td>
                      <td>${escapeHTML(item.room_name || "-")}</td>
                      <td>${escapeHTML(item.academic_year || "-")}</td>
                      <td>${escapeHTML(item.semester || "-")}</td>
                      <td>
                        ${item.is_published ? "Dipublikasikan" : "Draf"}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }).join("");

      showScheduleMessage(
        "Jadwal mengajar berhasil dimuat.",
        "success"
      );

    } catch (error) {
      scheduleContent.innerHTML = "";
      showScheduleMessage(
        "Gagal memuat jadwal: " + error.message,
        "error"
      );
    }
  }

  // Memeriksa sesi login saat halaman dibuka.
  async function checkSession() {
    const { data, error } = await client.auth.getSession();

    if (error) {
      showLoggedOut();
      showLoginMessage("Gagal memeriksa sesi login.", "error");
      return;
    }

    if (!data.session) {
      showLoggedOut();
      return;
    }

    try {
      await verifyGuru(data.session.user.id);

      showLoggedIn();
      await loadTeacherSchedules();

    } catch (error) {
      await client.auth.signOut();
      showLoggedOut();
      showLoginMessage(error.message, "error");
    }
  }

  // Login khusus akun Guru.
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("teacherEmail").value.trim();
    const password = document.getElementById("teacherPassword").value;

    loginButton.disabled = true;
    loginButton.textContent = "Memproses...";
    showLoginMessage("Sedang memeriksa akun...");

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await verifyGuru(data.user.id);

      showLoggedIn();
      await loadTeacherSchedules();

    } catch (error) {
      await client.auth.signOut();
      showLoggedOut();
      showLoginMessage(error.message, "error");

    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Masuk";
    }
  });

  // Logout.
  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;

    const { error } = await client.auth.signOut();

    logoutButton.disabled = false;

    if (error) {
      showScheduleMessage(
        "Gagal keluar: " + error.message,
        "error"
      );
      return;
    }

    showLoggedOut();
    showLoginMessage("Anda telah keluar dari akun.");
  });

  if (!client) {
    showLoginMessage("Koneksi database tidak tersedia.", "error");
    loginButton.disabled = true;
    return;
  }

  checkSession();

})();
