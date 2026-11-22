
(function () {
  const client = window.supabaseClient;

  const form = document.getElementById("agendaForm");
  const titleInput = document.getElementById("agendaTitle");
  const descriptionInput = document.getElementById("agendaDescription");
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");
  const statusInput = document.getElementById("agendaStatus");
  const idInput = document.getElementById("agendaId");
  const table = document.getElementById("agendaTable");
  const message = document.getElementById("formMessage");
  const saveButton = document.getElementById("saveButton");
  const cancelButton = document.getElementById("cancelButton");
  const formTitle = document.getElementById("formTitle");

  let events = [];

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#b42318" : "#16803c";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function formatDate(value) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date(parts[0], parts[1] - 1, parts[2]));
  }

  async function checkAccess() {
    if (!client) {
      window.location.replace("admin.html");
      return false;
    }

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError || !sessionData.session) {
      window.location.replace("admin.html");
      return false;
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
      await client.auth.signOut();
      window.location.replace("admin.html");
      return false;
    }

    return true;
  }

  async function loadEvents() {
    table.innerHTML = `
      <tr><td colspan="6">Memuat data...</td></tr>
    `;

    const { data, error } = await client
      .from("academic_events")
      .select("id, title, description, start_date, end_date, is_published")
      .order("start_date", { ascending: true });

    if (error) {
      table.innerHTML = `
        <tr><td colspan="6">Gagal memuat data agenda.</td></tr>
      `;
      showMessage("Gagal mengambil data: " + error.message, true);
      return;
    }

    events = data || [];
    renderEvents();
  }

  function renderEvents() {
    if (!events.length) {
      table.innerHTML = `
        <tr><td colspan="6">Belum ada agenda akademik.</td></tr>
      `;
      return;
    }

    table.innerHTML = events.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.title)}</td>
        <td>${escapeHTML(formatDate(item.start_date))}</td>
        <td>${escapeHTML(formatDate(item.end_date))}</td>
        <td>
          <span class="status ${
            item.is_published ? "published" : "draft"
          }">
            ${item.is_published ? "Terbit" : "Draft"}
          </span>
        </td>
        <td>
          <button
            type="button"
            class="secondary-button"
            data-action="edit"
            data-id="${escapeHTML(item.id)}"
          >
            Edit
          </button>

          <button
            type="button"
            class="delete-button"
            data-action="delete"
            data-id="${escapeHTML(item.id)}"
          >
            Hapus
          </button>
        </td>
      </tr>
    `).join("");
  }

  function resetForm() {
    form.reset();
    idInput.value = "";
    statusInput.value = "draft";
    formTitle.textContent = "Tambah Agenda Akademik";
    saveButton.textContent = "Simpan Agenda";
    cancelButton.hidden = true;
    showMessage("");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const startDate = startInput.value;
    const endDate = endInput.value;
    const isPublished = statusInput.value === "published";
    const id = idInput.value;

    if (!title || !startDate || !endDate) {
      showMessage("Nama kegiatan dan tanggal wajib diisi.", true);
      return;
    }

    if (endDate < startDate) {
      showMessage(
        "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
        true
      );
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Menyimpan...";
    showMessage("");

    try {
      const payload = {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        is_published: isPublished
      };

      let result;

      if (id) {
        result = await client
          .from("academic_events")
          .update(payload)
          .eq("id", id);
      } else {
        result = await client
          .from("academic_events")
          .insert(payload);
      }

      if (result.error) throw result.error;

      showMessage(
        isPublished
          ? "Agenda berhasil diterbitkan."
          : "Agenda berhasil disimpan sebagai draft."
      );

      resetForm();
      await loadEvents();

    } catch (error) {
      showMessage("Gagal menyimpan: " + error.message, true);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Simpan Agenda";
    }
  });

  cancelButton.addEventListener("click", resetForm);

  table.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const item = events.find(entry => entry.id === id);

    if (!item) return;

    if (action === "edit") {
      idInput.value = item.id;
      titleInput.value = item.title;
      descriptionInput.value = item.description || "";
      startInput.value = item.start_date;
      endInput.value = item.end_date;
      statusInput.value = item.is_published ? "published" : "draft";

      formTitle.textContent = "Edit Agenda Akademik";
      saveButton.textContent = "Perbarui Agenda";
      cancelButton.hidden = false;

      showMessage("Mode edit aktif.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
      const confirmed = confirm(
        "Apakah Anda yakin ingin menghapus agenda ini?"
      );

      if (!confirmed) return;

      button.disabled = true;

      const { error } = await client
        .from("academic_events")
        .delete()
        .eq("id", id);

      if (error) {
        showMessage("Gagal menghapus: " + error.message, true);
        button.disabled = false;
        return;
      }

      showMessage("Agenda berhasil dihapus.");
      await loadEvents();
    }
  });

  async function initialize() {
    const allowed = await checkAccess();
    if (!allowed) return;

    await loadEvents();
  }

  initialize().catch(error => {
    console.error(error);
    showMessage("Terjadi kesalahan: " + error.message, true);
  });
})();
