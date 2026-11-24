
(function () {
  const client = window.supabaseClient;

  const message = document.getElementById("scheduleMessage");
  const content = document.getElementById("schedulePageContent");

  function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = `message ${type}`;
  }

  async function init() {
    if (!client) {
      window.location.replace("admin.html");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError || !sessionData.session) {
      window.location.replace("admin.html");
      return;
    }

    const user = sessionData.session.user;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      !["admin", "wakakur"].includes(profile.role)
    ) {
      showMessage("Akses ditolak.", "error");
      return;
    }

    content.innerHTML = "<p>Memuat data tugas mengajar...</p>";

    const [assignmentsResult, teachersResult, classesResult, subjectsResult] =
      await Promise.all([
        client.from("teaching_assignments")
          .select("id, teacher_id, class_id, subject_id, hours_per_week, academic_year, semester")
          .order("academic_year", { ascending: true }),

        client.from("teachers")
          .select("id, full_name")
          .order("full_name", { ascending: true }),

        client.from("classes")
          .select("id, class_name")
          .order("class_name", { ascending: true }),

        client.from("subjects")
          .select("id, subject_name")
          .order("subject_name", { ascending: true })
      ]);

    if (assignmentsResult.error) {
      content.innerHTML = "";
      showMessage(
        "Gagal memuat tugas mengajar: " + assignmentsResult.error.message,
        "error"
      );
      return;
    }

    if (teachersResult.error || classesResult.error || subjectsResult.error) {
      content.innerHTML = "";
      showMessage("Gagal memuat data pendukung.", "error");
      return;
    }

    const assignments = assignmentsResult.data || [];
    const teachers = teachersResult.data || [];
    const classes = classesResult.data || [];
    const subjects = subjectsResult.data || [];

    if (assignments.length === 0) {
      content.innerHTML = "<p>Belum ada data tugas mengajar.</p>";
      showMessage("Data berhasil diperiksa.", "success");
      return;
    }

    const escapeHTML = value =>
      String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);

    const rows = assignments.map((item, index) => {
      const teacher = teachers.find(x => x.id === item.teacher_id);
      const classroom = classes.find(x => x.id === item.class_id);
      const subject = subjects.find(x => x.id === item.subject_id);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHTML(teacher?.full_name || "Tidak ditemukan")}</td>
          <td>${escapeHTML(classroom?.class_name || "Tidak ditemukan")}</td>
          <td>${escapeHTML(subject?.subject_name || "Tidak ditemukan")}</td>
          <td>${escapeHTML(item.hours_per_week)}</td>
          <td>${escapeHTML(item.academic_year)}</td>
          <td>${escapeHTML(item.semester)}</td>
        </tr>
      `;
    }).join("");

    content.innerHTML = `
      <h3>Daftar Tugas Mengajar</h3>
      <p>Data tugas mengajar yang tersedia di database.</p>

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
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    showMessage(
      "Berhasil memuat " + assignments.length + " data tugas mengajar.",
      "success"
    );
  }

  init();
})();
