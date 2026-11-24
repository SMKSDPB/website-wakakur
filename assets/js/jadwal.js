
(function () {
  const client = window.supabaseClient;
  const message = document.getElementById("publicScheduleMessage");
  const content = document.getElementById("publicScheduleContent");

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

  function getTime(value) {
    return String(value || "").slice(0, 5);
  }

  function getUniqueValues(field) {
    return [...new Set(
      schedules.map(item => item[field]).filter(Boolean)
    )].sort();
  }

  function renderPage() {
    const academicYears = getUniqueValues("academic_year");
    const semesters = ["Ganjil", "Genap"];
    const classNames = getUniqueValues("class_name");
    const teacherNames = getUniqueValues("teacher_name");

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
            <option value="${item}">${item}</option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="publicFilterClass">Pilih Kelas</label>
        <select id="publicFilterClass">
          <option value="">Semua Kelas</option>
          ${classNames.map(item => `
            <option value="${escapeHTML(item)}">
              ${escapeHTML(item)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="publicFilterTeacher">Pilih Guru</label>
        <select id="publicFilterTeacher">
          <option value="">Semua Guru</option>
          ${teacherNames.map(item => `
            <option value="${escapeHTML(item)}">
              ${escapeHTML(item)}
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

    const filtered = schedules.filter(item => (
      (!yearFilter || item.academic_year === yearFilter) &&
      (!semesterFilter || item.semester === semesterFilter) &&
      (!classFilter || item.class_name === classFilter) &&
      (!teacherFilter || item.teacher_name === teacherFilter)
    ));

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
          <h3>${escapeHTML(day)}</h3>

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
                ${daySchedules.map(item => `
                  <tr>
                    <td>
                      ${escapeHTML(getTime(item.start_time))}
                      -
                      ${escapeHTML(getTime(item.end_time))}
                    </td>
                    <td>${escapeHTML(item.class_name || "-")}</td>
                    <td>${escapeHTML(item.subject_name || "-")}</td>
                    <td>${escapeHTML(item.teacher_name || "-")}</td>
                    <td>${escapeHTML(item.room_name || "-")}</td>
                  </tr>
                `).join("")}
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
      const { data, error } = await client
        .from("public_published_schedules")
        .select("*");

      if (error) throw error;

      schedules = data || [];

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
