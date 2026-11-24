
(function () {
  const client = window.supabaseClient;
  const message = document.getElementById("publicScheduleMessage");
  const content = document.getElementById("publicScheduleContent");

  let schedules = [];
  let assignments = [];
  let teachers = [];
  let classes = [];
  let subjects = [];

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

  function getTeacher(id) {
    return teachers.find(item => item.id === id);
  }

  function getClass(id) {
    return classes.find(item => item.id === id);
  }

  function getSubject(id) {
    return subjects.find(item => item.id === id);
  }

  function getTime(value) {
    return String(value || "").slice(0, 5);
  }

  function getUniqueValues(items, field) {
    return [...new Set(
      items.map(item => item[field]).filter(Boolean)
    )].sort();
  }

  function renderPage() {
    const academicYears = getUniqueValues(schedules, "academic_year");
    const semesters = ["Ganjil", "Genap"];

    content.innerHTML = `
      <div class="form-group">
        <label for="publicFilterYear">Tahun Pelajaran</label>
        <select id="publicFilterYear">
          <option value="">Semua Tahun Pelajaran</option>
          ${academicYears.map(item => `
            <option value="${escapeHTML(item)}">
              ${escapeHTML(item)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="publicFilterSemester">Semester</label>
        <select id="publicFilterSemester">
          <option value="">Semua Semester</option>
          ${semesters.map(item => `
            <option value="${escapeHTML(item)}">
              ${escapeHTML(item)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="publicFilterClass">Pilih Kelas</label>
        <select id="publicFilterClass">
          <option value="">Semua Kelas</option>
          ${classes.map(item => `
            <option value="${escapeHTML(item.id)}">
              ${escapeHTML(item.class_name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="publicFilterTeacher">Pilih Guru</label>
        <select id="publicFilterTeacher">
          <option value="">Semua Guru</option>
          ${teachers.map(item => `
            <option value="${escapeHTML(item.id)}">
              ${escapeHTML(item.full_name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div id="publicScheduleList"></div>
    `;

    [
      "publicFilterYear",
      "publicFilterSemester",
      "publicFilterClass",
      "publicFilterTeacher"
    ].forEach(id => {
      document.getElementById(id)
        .addEventListener("change", renderSchedules);
    });

    renderSchedules();
  }

  function renderSchedules() {
    const list = document.getElementById("publicScheduleList");
    if (!list) return;

    const yearFilter =
      document.getElementById("publicFilterYear").value;

    const semesterFilter =
      document.getElementById("publicFilterSemester").value;

    const classFilter =
      document.getElementById("publicFilterClass").value;

    const teacherFilter =
      document.getElementById("publicFilterTeacher").value;

    const filtered = schedules.filter(item => {
      const assignment = getAssignment(item.assignment_id);
      if (!assignment) return false;

      return (
        (!yearFilter || item.academic_year === yearFilter) &&
        (!semesterFilter || item.semester === semesterFilter) &&
        (!classFilter || assignment.class_id === classFilter) &&
        (!teacherFilter || assignment.teacher_id === teacherFilter)
      );
    });

    filtered.sort((a, b) =>
      days.indexOf(a.day_name) - days.indexOf(b.day_name) ||
      getTime(a.start_time).localeCompare(getTime(b.start_time))
    );

    if (!filtered.length) {
      list.innerHTML = `
        <p>Belum ada jadwal pembelajaran untuk pilihan tersebut.</p>
      `;
      return;
    }

    list.innerHTML = days.map(day => {
      const daySchedules = filtered.filter(
        item => item.day_name === day
      );

      if (!daySchedules.length) return "";

      return `
        <section class="card" style="margin-top:20px;">
          <h3>${day}</h3>

          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th>Jam</th>
                  <th>Kelas</th>
                  <th>Mata Pelajaran</th>
                  <th>Guru</th>
                  <th>Ruangan</th>
                </tr>
              </thead>
              <tbody>
                ${daySchedules.map(item => {
                  const assignment = getAssignment(item.assignment_id);
                  const teacher = getTeacher(assignment.teacher_id);
                  const classroom = getClass(assignment.class_id);
                  const subject = getSubject(assignment.subject_id);

                  return `
                    <tr>
                      <td>
                        ${escapeHTML(getTime(item.start_time))}
                        -
                        ${escapeHTML(getTime(item.end_time))}
                      </td>
                      <td>${escapeHTML(classroom?.class_name || "-")}</td>
                      <td>${escapeHTML(subject?.subject_name || "-")}</td>
                      <td>${escapeHTML(teacher?.full_name || "-")}</td>
                      <td>${escapeHTML(item.room_name || "-")}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    }).join("");
  }

  async function init() {
    if (!client) {
      showMessage("Koneksi database tidak tersedia.", "error");
      return;
    }

    showMessage("Memuat jadwal pembelajaran...");

    try {
      const results = await Promise.all([
        client.from("schedules")
          .select("id, assignment_id, day_name, start_time, end_time, room_name, academic_year, semester")
          .eq("is_published", true),

        client.from("teaching_assignments")
          .select("id, teacher_id, class_id, subject_id"),

        client.from("teachers")
          .select("id, full_name"),

        client.from("classes")
          .select("id, class_name"),

        client.from("subjects")
          .select("id, subject_name")
      ]);

      const error = results.find(result => result.error);
      if (error) throw error.error;

      schedules = results[0].data || [];
      assignments = results[1].data || [];
      teachers = results[2].data || [];
      classes = results[3].data || [];
      subjects = results[4].data || [];

      renderPage();

      showMessage(
        schedules.length
          ? "Jadwal pembelajaran berhasil dimuat."
          : "Belum ada jadwal yang dipublikasikan.",
        "success"
      );

    } catch (error) {
      showMessage(
        "Gagal memuat jadwal: " + error.message,
        "error"
      );
    }
  }

  init();
})();
