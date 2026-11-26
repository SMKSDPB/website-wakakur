
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

  async function checkSession() {
    const { data, error } = await client.auth.getSession();

    if (error) {
      showLoginMessage("Gagal memeriksa sesi login.");
      return;
    }

    if (data.session) {
      showLoggedIn();
      await loadTeacherSchedules();
    } else {
      showLoggedOut();
    }
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("teacherEmail").value.trim();
    const password = document.getElementById("teacherPassword").value;

    loginButton.disabled = true;
    loginButton.textContent = "Memproses...";
    showLoginMessage("Sedang memeriksa akun...");

    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showLoggedIn();
      await loadTeacherSchedules();

    } catch (error) {
      showLoginMessage(
        "Login gagal. Periksa email dan password Anda.",
        "error"
      );
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Masuk";
    }
  });

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
