
(function () {
  const client = window.supabaseClient;
  const message = document.getElementById("scheduleMessage");
  const content = document.getElementById("schedulePageContent");

  let assignments = [];
  let teachers = [];
  let classes = [];
  let subjects = [];
  let schedules = [];

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

  function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = `message ${type}`;
  }

  function getAssignment(id) {
    return assignments.find(item => item.id === id);
  }

  function getAssignmentLabel(item) {
    const teacher = teachers.find(x => x.id === item.teacher_id);
    const classroom = classes.find(x => x.id === item.class_id);
    const subject = subjects.find(x => x.id === item.subject_id);

    return [
      teacher?.full_name || "Guru tidak ditemukan",
      classroom?.class_name || "Kelas tidak ditemukan",
      subject?.subject_name || "Mapel tidak ditemukan"
    ].join(" — ");
  }

  function timeToMinutes(value) {
    if (!value) return 0;
    const parts = value.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function getTime(value) {
    return String(value || "").slice(0, 5);
  }

  function getScheduleAssignment(schedule) {
    return getAssignment(schedule.assignment_id);
  }

  function renderPage() {
    content.innerHTML = `
      <section class="card" style="margin-bottom:24px;">
        <h3 id="scheduleFormTitle">Tambah Jadwal Pembelajaran</h3>

        <form id="scheduleForm">
          <input type="hidden" id="scheduleId">

          <div class="form-group">
            <label for="scheduleAssignment">Tugas Mengajar</label>
            <select id="scheduleAssignment" required>
              <option value="">Pilih Guru, Kelas, dan Mata Pelajaran</option>
              ${assignments.map(item => `
                <option value="${escapeHTML(item.id)}">
                  ${escapeHTML(getAssignmentLabel(item))}
                  (${escapeHTML(item.academic_year)} - ${escapeHTML(item.semester)})
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label for="scheduleDay">Hari</label>
            <select id="scheduleDay" required>
              <option value="">Pilih Hari</option>
              ${days.map(day => `
                <option value="${day}">${day}</option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label for="scheduleStart">Jam Mulai</label>
            <input type="time" id="scheduleStart" required>
          </div>

          <div class="form-group">
            <label for="scheduleEnd">Jam Selesai</label>
            <input type="time" id="scheduleEnd" required>
          </div>

          <div class="form-group">
            <label for="scheduleRoom">Ruangan</label>
            <input type="text" id="scheduleRoom"
              placeholder="Contoh: Ruang 1">
          </div>

          <div class="form-group">
            <label>Tahun Pelajaran</label>
            <input type="text" id="scheduleYear" readonly
              placeholder="Mengikuti tugas mengajar">
          </div>

          <div class="form-group">
            <label>Semester</label>
            <input type="text" id="scheduleSemester" readonly
              placeholder="Mengikuti tugas mengajar">
          </div>

          <button type="submit" id="saveScheduleButton">
            Simpan Jadwal
          </button>

          <button type="button" id="cancelScheduleButton" hidden>
            Batal Edit
          </button>
        </form>
      </section>

      <section class="card">
        <h3>Daftar Jadwal Pembelajaran</h3>

        <div class="form-group">
          <label for="filterTeacher">Filter Guru</label>
          <select id="filterTeacher">
            <option value="">Semua Guru</option>
            ${teachers.map(item => `
              <option value="${escapeHTML(item.id)}">
                ${escapeHTML(item.full_name)}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label for="filterClass">Filter Kelas</label>
          <select id="filterClass">
            <option value="">Semua Kelas</option>
            ${classes.map(item => `
              <option value="${escapeHTML(item.id)}">
                ${escapeHTML(item.class_name)}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label for="filterDay">Filter Hari</label>
          <select id="filterDay">
            <option value="">Semua Hari</option>
            ${days.map(day => `
              <option value="${day}">${day}</option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label for="filterYear">Filter Tahun Pelajaran</label>
          <select id="filterYear">
            <option value="">Semua Tahun Pelajaran</option>
            ${[...new Set(assignments.map(x => x.academic_year))]
              .filter(Boolean).map(year => `
                <option value="${escapeHTML(year)}">
                  ${escapeHTML(year)}
                </option>
              `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label for="filterSemester">Filter Semester</label>
          <select id="filterSemester">
            <option value="">Semua Semester</option>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>

        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Hari</th>
                <th>Jam</th>
                <th>Guru</th>
                <th>Kelas</th>
                <th>Mata Pelajaran</th>
                <th>Ruangan</th>
                <th>Tahun Pelajaran</th>
                <th>Semester</th>
                <th>Status Publikasi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="scheduleTableBody"></tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById("scheduleAssignment")
      .addEventListener("change", updateAcademicInfo);

    document.getElementById("scheduleForm")
      .addEventListener("submit", saveSchedule);

    document.getElementById("cancelScheduleButton")
      .addEventListener("click", resetForm);

    [
      "filterTeacher",
      "filterClass",
      "filterDay",
      "filterYear",
      "filterSemester"
    ].forEach(id => {
      document.getElementById(id)
        .addEventListener("change", renderSchedules);
    });

    document.getElementById("scheduleTableBody")
      .addEventListener("click", handleTableAction);

    renderSchedules();
  }

  function updateAcademicInfo() {
    const assignment = getAssignment(
      document.getElementById("scheduleAssignment").value
    );

    document.getElementById("scheduleYear").value =
      assignment?.academic_year || "";

    document.getElementById("scheduleSemester").value =
      assignment?.semester || "";
  }

  function renderSchedules() {
    const body = document.getElementById("scheduleTableBody");
    if (!body) return;

    const teacherFilter = document.getElementById("filterTeacher").value;
    const classFilter = document.getElementById("filterClass").value;
    const dayFilter = document.getElementById("filterDay").value;
    const yearFilter = document.getElementById("filterYear").value;
    const semesterFilter = document.getElementById("filterSemester").value;

    const filtered = schedules.filter(item => {
      const assignment = getScheduleAssignment(item);
      if (!assignment) return false;

      return (
        (!teacherFilter || assignment.teacher_id === teacherFilter) &&
        (!classFilter || assignment.class_id === classFilter) &&
        (!dayFilter || item.day_name === dayFilter) &&
        (!yearFilter || item.academic_year === yearFilter) &&
        (!semesterFilter || item.semester === semesterFilter)
      );
    });

    filtered.sort((a, b) =>
      days.indexOf(a.day_name) - days.indexOf(b.day_name) ||
      getTime(a.start_time).localeCompare(getTime(b.start_time))
    );

    if (!filtered.length) {
      body.innerHTML = `
        <tr>
          <td colspan="11">Belum ada jadwal yang sesuai.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = filtered.map((item, index) => {
      const assignment = getScheduleAssignment(item);
      const teacher = teachers.find(x => x.id === assignment.teacher_id);
      const classroom = classes.find(x => x.id === assignment.class_id);
      const subject = subjects.find(x => x.id === assignment.subject_id);

      const published = item.is_published === true;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHTML(item.day_name)}</td>
          <td>${escapeHTML(getTime(item.start_time))} -
              ${escapeHTML(getTime(item.end_time))}</td>
          <td>${escapeHTML(teacher?.full_name || "-")}</td>
          <td>${escapeHTML(classroom?.class_name || "-")}</td>
          <td>${escapeHTML(subject?.subject_name || "-")}</td>
          <td>${escapeHTML(item.room_name || "-")}</td>
          <td>${escapeHTML(item.academic_year)}</td>
          <td>${escapeHTML(item.semester)}</td>
          <td>
            ${published
              ? '<span style="color:green;font-weight:bold;">Dipublikasikan</span>'
              : '<span style="color:#9a6500;font-weight:bold;">Draf</span>'}
          </td>
          <td>
            <button type="button" data-action="edit"
              data-id="${escapeHTML(item.id)}">Edit</button>

            <button type="button"
              data-action="${published ? "unpublish" : "publish"}"
              data-id="${escapeHTML(item.id)}">
              ${published ? "Tarik Publikasi" : "Publikasikan"}
            </button>

            <button type="button" data-action="delete"
              data-id="${escapeHTML(item.id)}">Hapus</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function checkConflict(payload, currentId) {
    const selected = getAssignment(payload.assignment_id);
    if (!selected) return "Tugas mengajar tidak ditemukan.";

    const start = timeToMinutes(payload.start_time);
    const end = timeToMinutes(payload.end_time);

    if (end <= start) {
      return "Jam selesai harus lebih besar dari jam mulai.";
    }

    for (const item of schedules) {
      if (item.id === currentId) continue;

      if (
        item.day_name !== payload.day_name ||
        item.academic_year !== payload.academic_year ||
        item.semester !== payload.semester
      ) continue;

      const other = getAssignment(item.assignment_id);
      if (!other) continue;

      const otherStart = timeToMinutes(item.start_time);
      const otherEnd = timeToMinutes(item.end_time);

      const overlap = start < otherEnd && end > otherStart;
      if (!overlap) continue;

      if (other.teacher_id === selected.teacher_id) {
        return "Benturan jadwal: guru tersebut sudah memiliki jadwal pada waktu yang sama.";
      }

      if (other.class_id === selected.class_id) {
        return "Benturan jadwal: kelas tersebut sudah memiliki jadwal pada waktu yang sama.";
      }
    }

    return "";
  }

  async function saveSchedule(event) {
    event.preventDefault();

    const id = document.getElementById("scheduleId").value;
    const assignment = getAssignment(
      document.getElementById("scheduleAssignment").value
    );

    if (!assignment) {
      showMessage("Silakan pilih tugas mengajar.", "error");
      return;
    }

    const payload = {
      assignment_id: assignment.id,
      day_name: document.getElementById("scheduleDay").value,
      start_time: document.getElementById("scheduleStart").value,
      end_time: document.getElementById("scheduleEnd").value,
      room_name: document.getElementById("scheduleRoom").value.trim() || null,
      academic_year: assignment.academic_year,
      semester: assignment.semester
    };

    if (!payload.day_name || !payload.start_time || !payload.end_time) {
      showMessage("Lengkapi tugas mengajar, hari, dan jam.", "error");
      return;
    }

    const conflict = checkConflict(payload, id);
    if (conflict) {
      showMessage(conflict, "error");
      return;
    }

    const button = document.getElementById("saveScheduleButton");
    button.disabled = true;
    button.textContent = "Menyimpan...";

    try {
      let result;

      if (id) {
        result = await client.from("schedules")
          .update(payload)
          .eq("id", id);
      } else {
        result = await client.from("schedules")
          .insert(payload);
      }

      if (result.error) throw result.error;

      showMessage(
        id ? "Jadwal berhasil diperbarui." : "Jadwal berhasil ditambahkan.",
        "success"
      );

      resetForm();
      await loadSchedules();

    } catch (error) {
      showMessage("Gagal menyimpan jadwal: " + error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Simpan Jadwal";
    }
  }

  function resetForm() {
    const form = document.getElementById("scheduleForm");
    if (!form) return;

    form.reset();
    document.getElementById("scheduleId").value = "";
    document.getElementById("scheduleFormTitle").textContent =
      "Tambah Jadwal Pembelajaran";
    document.getElementById("saveScheduleButton").textContent =
      "Simpan Jadwal";
    document.getElementById("cancelScheduleButton").hidden = true;
    document.getElementById("scheduleYear").value = "";
    document.getElementById("scheduleSemester").value = "";
  }

  function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") editSchedule(id);
    if (action === "delete") deleteSchedule(id);
    if (action === "publish") updatePublication(id, true);
    if (action === "unpublish") updatePublication(id, false);
  }

  async function updatePublication(id, publish) {
    const item = schedules.find(x => x.id === id);
    if (!item) return;

    if (!publish && !confirm(
      "Tarik publikasi jadwal ini? Jadwal tidak lagi terlihat oleh publik."
    )) {
      return;
    }

    if (publish && !confirm(
      "Publikasikan jadwal ini agar dapat dilihat oleh publik?"
    )) {
      return;
    }

    try {
      const { error } = await client.from("schedules")
        .update({ is_published: publish })
        .eq("id", id);

      if (error) throw error;

      showMessage(
        publish
          ? "Jadwal berhasil dipublikasikan."
          : "Publikasi jadwal berhasil ditarik.",
        "success"
      );

      await loadSchedules();

    } catch (error) {
      showMessage(
        "Gagal mengubah status publikasi: " + error.message,
        "error"
      );
    }
  }

  function editSchedule(id) {
    const item = schedules.find(x => x.id === id);
    if (!item) return;

    document.getElementById("scheduleId").value = item.id;
    document.getElementById("scheduleAssignment").value = item.assignment_id;
    document.getElementById("scheduleDay").value = item.day_name;
    document.getElementById("scheduleStart").value = getTime(item.start_time);
    document.getElementById("scheduleEnd").value = getTime(item.end_time);
    document.getElementById("scheduleRoom").value = item.room_name || "";

    updateAcademicInfo();

    document.getElementById("scheduleFormTitle").textContent =
      "Edit Jadwal Pembelajaran";
    document.getElementById("saveScheduleButton").textContent =
      "Simpan Perubahan";
    document.getElementById("cancelScheduleButton").hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteSchedule(id) {
    const item = schedules.find(x => x.id === id);
    if (!item) return;

    if (!confirm("Apakah jadwal ini ingin dihapus?")) return;

    const { error } = await client.from("schedules")
      .delete()
      .eq("id", id);

    if (error) {
      showMessage("Gagal menghapus jadwal: " + error.message, "error");
      return;
    }

    showMessage("Jadwal berhasil dihapus.", "success");
    await loadSchedules();
  }

  async function loadSchedules() {
    const { data, error } = await client.from("schedules")
      .select("id, assignment_id, day_name, start_time, end_time, room_name, academic_year, semester, is_published")
      .order("day_name", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      showMessage("Gagal memuat jadwal: " + error.message, "error");
      return;
    }

    schedules = data || [];
    renderSchedules();
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

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, is_active")
      .eq("user_id", sessionData.session.user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      !["admin", "wakakur"].includes(profile.role)
    ) {
      showMessage("Anda tidak memiliki akses ke halaman ini.", "error");
      return;
    }

    showMessage("Memuat data manajemen jadwal...");

    const results = await Promise.all([
      client.from("teaching_assignments")
        .select("id, teacher_id, class_id, subject_id, hours_per_week, academic_year, semester"),
      client.from("teachers").select("id, full_name"),
      client.from("classes").select("id, class_name"),
      client.from("subjects").select("id, subject_name")
    ]);

    const error = results.find(result => result.error);
    if (error) {
      showMessage("Gagal memuat data pendukung: " + error.error.message, "error");
      return;
    }

    assignments = results[0].data || [];
    teachers = results[1].data || [];
    classes = results[2].data || [];
    subjects = results[3].data || [];

    renderPage();
    await loadSchedules();

    showMessage("Manajemen jadwal siap digunakan.", "success");
  }

  init();
})();
