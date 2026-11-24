
(function () {
  const client = window.supabaseClient;

  const tables = {
    teachers: [],
    classes: [],
    subjects: [],
    assignments: []
  };

  const configs = {
    teachers: {
      table: "teachers",
      fields: ["id", "teacher_code", "full_name", "email", "phone", "employment_status"],
      order: "full_name"
    },
    classes: {
      table: "classes",
      fields: ["id", "class_name", "grade_level", "program_name", "academic_year"],
      order: "grade_level"
    },
    subjects: {
      table: "subjects",
      fields: ["id", "subject_name", "subject_code"],
      order: "subject_name"
    },
    assignments: {
      table: "teaching_assignments",
      fields: ["id", "teacher_id", "class_id", "subject_id", "hours_per_week", "academic_year", "semester"],
      order: "academic_year"
    }
  };

  if (!client) {
    alert("Koneksi database belum tersedia.");
    window.location.replace("admin.html");
    return;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function showMessage(type, text, isError = false) {
    const element = document.getElementById(type + "Message");
    if (!element) return;

    element.textContent = text;
    element.style.color = isError ? "#b00020" : "#247a35";
  }

  function resetForm(type) {
    const form = document.getElementById(
      type === "teachers" ? "teacherForm" :
      type === "classes" ? "classForm" :
      type === "subjects" ? "subjectForm" :
      "assignmentForm"
    );

    form.reset();

    const idField = {
      teachers: "teacherId",
      classes: "classId",
      subjects: "subjectId",
      assignments: "assignmentId"
    }[type];

    document.getElementById(idField).value = "";

    const buttonId = {
      teachers: "saveTeacherButton",
      classes: "saveClassButton",
      subjects: "saveSubjectButton",
      assignments: "saveAssignmentButton"
    }[type];

    const cancelId = {
      teachers: "cancelTeacherButton",
      classes: "cancelClassButton",
      subjects: "cancelSubjectButton",
      assignments: "cancelAssignmentButton"
    }[type];

    const buttonText = {
      teachers: "Simpan Guru",
      classes: "Simpan Rombel",
      subjects: "Simpan Mata Pelajaran",
      assignments: "Simpan Tugas Mengajar"
    }[type];

    document.getElementById(buttonId).textContent = buttonText;
    document.getElementById(cancelId).hidden = true;
  }

  async function checkAccess() {
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError || !sessionData.session) {
      window.location.replace("admin.html");
      return false;
    }

    const user = sessionData.session.user;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("full_name, role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      !["admin", "wakakur"].includes(profile.role)
    ) {
      await client.auth.signOut();
      window.location.replace("admin.html");
      return false;
    }

    return true;
  }

  function renderTeachers() {
    const body = document.getElementById("teacherTableBody");

    if (!tables.teachers.length) {
      body.innerHTML = '<tr><td colspan="7">Belum ada data guru.</td></tr>';
      return;
    }

    body.innerHTML = tables.teachers.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.teacher_code)}</td>
        <td>${escapeHTML(item.full_name)}</td>
        <td>${escapeHTML(item.email || "-")}</td>
        <td>${escapeHTML(item.phone || "-")}</td>
        <td>${escapeHTML(item.employment_status || "-")}</td>
        <td>
          <div class="module-actions">
            <button data-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
            <button class="danger" data-action="delete" data-id="${escapeHTML(item.id)}">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderClasses() {
    const body = document.getElementById("classTableBody");

    if (!tables.classes.length) {
      body.innerHTML = '<tr><td colspan="6">Belum ada data rombel.</td></tr>';
      return;
    }

    body.innerHTML = tables.classes.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.class_name)}</td>
        <td>${escapeHTML(item.grade_level)}</td>
        <td>${escapeHTML(item.program_name)}</td>
        <td>${escapeHTML(item.academic_year)}</td>
        <td>
          <div class="module-actions">
            <button data-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
            <button class="danger" data-action="delete" data-id="${escapeHTML(item.id)}">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderSubjects() {
    const body = document.getElementById("subjectTableBody");

    if (!tables.subjects.length) {
      body.innerHTML = '<tr><td colspan="4">Belum ada mata pelajaran.</td></tr>';
      return;
    }

    body.innerHTML = tables.subjects.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.subject_name)}</td>
        <td>${escapeHTML(item.subject_code || "-")}</td>
        <td>
          <div class="module-actions">
            <button data-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
            <button class="danger" data-action="delete" data-id="${escapeHTML(item.id)}">Hapus</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderAssignments() {
    const body = document.getElementById("assignmentTableBody");

    if (!tables.assignments.length) {
      body.innerHTML = '<tr><td colspan="8">Belum ada tugas mengajar.</td></tr>';
      return;
    }

    body.innerHTML = tables.assignments.map((item, index) => {
      const teacher = tables.teachers.find(x => x.id === item.teacher_id);
      const classroom = tables.classes.find(x => x.id === item.class_id);
      const subject = tables.subjects.find(x => x.id === item.subject_id);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHTML(teacher?.full_name || "Data guru tidak ditemukan")}</td>
          <td>${escapeHTML(classroom?.class_name || "Data rombel tidak ditemukan")}</td>
          <td>${escapeHTML(subject?.subject_name || "Data mapel tidak ditemukan")}</td>
          <td>${escapeHTML(item.hours_per_week)}</td>
          <td>${escapeHTML(item.academic_year)}</td>
          <td>${item.semester == 1 ? "Ganjil" : "Genap"}</td>
          <td>
            <div class="module-actions">
              <button data-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
              <button class="danger" data-action="delete" data-id="${escapeHTML(item.id)}">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadTable(type) {
    const config = configs[type];

    const { data, error } = await client
      .from(config.table)
      .select(config.fields.join(","))
      .order(config.order, { ascending: true });

    if (error) {
      showMessage(type === "teachers" ? "teacher" :
        type === "classes" ? "class" :
        type === "subjects" ? "subject" : "assignment",
        "Gagal memuat data: " + error.message, true);
      return;
    }

    tables[type] = data || [];

    if (type === "teachers") renderTeachers();
    if (type === "classes") renderClasses();
    if (type === "subjects") renderSubjects();
    if (type === "assignments") renderAssignments();

    updateAssignmentOptions();
  }

  function updateAssignmentOptions() {
    const options = [
      {
        id: "assignmentTeacher",
        data: tables.teachers,
        value: "id",
        label: item => item.full_name
      },
      {
        id: "assignmentClass",
        data: tables.classes,
        value: "id",
        label: item => item.class_name
      },
      {
        id: "assignmentSubject",
        data: tables.subjects,
        value: "id",
        label: item => item.subject_name
      }
    ];

    options.forEach(config => {
      const select = document.getElementById(config.id);
      const currentValue = select.value;

      select.innerHTML =
        '<option value="">Pilih ' +
        (config.id === "assignmentTeacher" ? "Guru" :
          config.id === "assignmentClass" ? "Rombel" : "Mata Pelajaran") +
        '</option>' +
        config.data.map(item => `
          <option value="${escapeHTML(item[config.value])}">
            ${escapeHTML(config.label(item))}
          </option>
        `).join("");

      if (config.data.some(item => String(item.id) === currentValue)) {
        select.value = currentValue;
      }
    });
  }

  function getFormData(type) {
    if (type === "teachers") {
      return {
        teacher_code: document.getElementById("teacherCode").value.trim(),
        full_name: document.getElementById("teacherName").value.trim(),
        email: document.getElementById("teacherEmail").value.trim() || null,
        phone: document.getElementById("teacherPhone").value.trim() || null,
        employment_status: document.getElementById("teacherStatus").value
      };
    }

    if (type === "classes") {
      return {
        class_name: document.getElementById("className").value.trim(),
        grade_level: document.getElementById("classGrade").value,
        program_name: document.getElementById("classProgram").value,
        academic_year: document.getElementById("classYear").value.trim()
      };
    }

    if (type === "subjects") {
      return {
        subject_name: document.getElementById("subjectName").value.trim(),
        subject_code: document.getElementById("subjectCode").value.trim() || null
      };
    }

    return {
      teacher_id: document.getElementById("assignmentTeacher").value,
      class_id: document.getElementById("assignmentClass").value,
      subject_id: document.getElementById("assignmentSubject").value,
      hours_per_week: Number(document.getElementById("assignmentHours").value),
      academic_year: document.getElementById("assignmentYear").value.trim(),
      semester: Number(document.getElementById("assignmentSemester").value)
    };
  }

  function getIdField(type) {
    return {
      teachers: "teacherId",
      classes: "classId",
      subjects: "subjectId",
      assignments: "assignmentId"
    }[type];
  }

  function getMessageType(type) {
    return {
      teachers: "teacher",
      classes: "class",
      subjects: "subject",
      assignments: "assignment"
    }[type];
  }

  async function saveRecord(type, event) {
    event.preventDefault();

    const id = document.getElementById(getIdField(type)).value;
    const payload = getFormData(type);
    const config = configs[type];
    const messageType = getMessageType(type);

    if (Object.values(payload).some(value => value === "")) {
      showMessage(messageType, "Lengkapi semua kolom wajib.", true);
      return;
    }

    if (type === "assignments" &&
        (!Number.isInteger(payload.hours_per_week) ||
         payload.hours_per_week < 1 ||
         payload.hours_per_week > 50)) {
      showMessage(messageType, "Jumlah JP harus antara 1 sampai 50.", true);
      return;
    }

    const buttonId = {
      teachers: "saveTeacherButton",
      classes: "saveClassButton",
      subjects: "saveSubjectButton",
      assignments: "saveAssignmentButton"
    }[type];

    const button = document.getElementById(buttonId);
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = "Menyimpan...";

      let result;

      if (id) {
        result = await client
          .from(config.table)
          .update(payload)
          .eq("id", id);
      } else {
        result = await client
          .from(config.table)
          .insert(payload);
      }

      if (result.error) throw result.error;

      showMessage(messageType,
        id ? "Data berhasil diperbarui." : "Data berhasil ditambahkan.");

      resetForm(type);
      await loadTable(type);

      if (type === "teachers" || type === "classes" || type === "subjects") {
        await loadTable("assignments");
      }

    } catch (error) {
      showMessage(messageType, "Gagal menyimpan data: " + error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function editRecord(type, id) {
    const item = tables[type].find(x => String(x.id) === String(id));
    if (!item) return;

    const mappings = {
      teachers: {
        teacherCode: item.teacher_code,
        teacherName: item.full_name,
        teacherEmail: item.email || "",
        teacherPhone: item.phone || "",
        teacherStatus: item.employment_status
      },
      classes: {
        className: item.class_name,
        classGrade: item.grade_level,
        classProgram: item.program_name,
        classYear: item.academic_year
      },
      subjects: {
        subjectName: item.subject_name,
        subjectCode: item.subject_code || ""
      },
      assignments: {
        assignmentTeacher: item.teacher_id,
        assignmentClass: item.class_id,
        assignmentSubject: item.subject_id,
        assignmentHours: item.hours_per_week,
        assignmentYear: item.academic_year,
        assignmentSemester: String(item.semester)
      }
    };

    document.getElementById(getIdField(type)).value = item.id;

    Object.entries(mappings[type]).forEach(([fieldId, value]) => {
      document.getElementById(fieldId).value = value;
    });

    const buttonId = {
      teachers: "saveTeacherButton",
      classes: "saveClassButton",
      subjects: "saveSubjectButton",
      assignments: "saveAssignmentButton"
    }[type];

    const cancelId = {
      teachers: "cancelTeacherButton",
      classes: "cancelClassButton",
      subjects: "cancelSubjectButton",
      assignments: "cancelAssignmentButton"
    }[type];

    document.getElementById(buttonId).textContent = "Simpan Perubahan";
    document.getElementById(cancelId).hidden = false;

    showMessage(getMessageType(type), "Mode edit aktif.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRecord(type, id) {
    const item = tables[type].find(x => String(x.id) === String(id));
    if (!item) return;

    const label =
      type === "teachers" ? item.full_name :
      type === "classes" ? item.class_name :
      type === "subjects" ? item.subject_name :
      "tugas mengajar";

    if (!confirm('Hapus data "' + label + '"?')) return;

    try {
      const { error } = await client
        .from(configs[type].table)
        .delete()
        .eq("id", id);

      if (error) throw error;

      showMessage(getMessageType(type), "Data berhasil dihapus.");
      await loadTable(type);

      if (type === "teachers" || type === "classes" || type === "subjects") {
        await loadTable("assignments");
      }

    } catch (error) {
      showMessage(getMessageType(type), "Gagal menghapus data: " + error.message, true);
    }
  }

  function bindForm(type, formId) {
    document.getElementById(formId).addEventListener("submit", event => {
      saveRecord(type, event);
    });
  }

  function bindCancel(type, buttonId) {
    document.getElementById(buttonId).addEventListener("click", () => {
      resetForm(type);
      showMessage(getMessageType(type), "");
    });
  }

  function bindTable(type, bodyId) {
    document.getElementById(bodyId).addEventListener("click", event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;

      if (button.dataset.action === "edit") {
        editRecord(type, id);
      }

      if (button.dataset.action === "delete") {
        deleteRecord(type, id);
      }
    });
  }

  function initializeTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");

    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const target = button.dataset.tab;

        buttons.forEach(item => item.classList.remove("active"));
        panels.forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        document.getElementById(target + "Panel").classList.add("active");
      });
    });
  }

  async function initialize() {
    const authorized = await checkAccess();
    if (!authorized) return;

    initializeTabs();

    bindForm("teachers", "teacherForm");
    bindForm("classes", "classForm");
    bindForm("subjects", "subjectForm");
    bindForm("assignments", "assignmentForm");

    bindCancel("teachers", "cancelTeacherButton");
    bindCancel("classes", "cancelClassButton");
    bindCancel("subjects", "cancelSubjectButton");
    bindCancel("assignments", "cancelAssignmentButton");

    bindTable("teachers", "teacherTableBody");
    bindTable("classes", "classTableBody");
    bindTable("subjects", "subjectTableBody");
    bindTable("assignments", "assignmentTableBody");

    await loadTable("teachers");
    await loadTable("classes");
    await loadTable("subjects");
    await loadTable("assignments");
  }

  initialize();
})();
