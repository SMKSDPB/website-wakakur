
(function () {
  const client = window.supabaseClient;

  const form = document.getElementById("announcementForm");
  const titleInput = document.getElementById("announcementTitle");
  const contentInput = document.getElementById("announcementContent");
  const statusInput = document.getElementById("announcementStatus");
  const idInput = document.getElementById("announcementId");
  const table = document.getElementById("announcementTable");
  const message = document.getElementById("formMessage");
  const saveButton = document.getElementById("saveButton");
  const cancelButton = document.getElementById("cancelButton");
  const formTitle = document.getElementById("formTitle");

  let announcements = [];

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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
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

  async function loadAnnouncements() {
    table.innerHTML = `
      <tr><td colspan="5">Memuat data...</td></tr>
    `;

    const { data, error } = await client
      .from("announcements")
      .select("id, title, content, published_at, is_published")
      .order("created_at", { ascending: false });

    if (error) {
      table.innerHTML = `
        <tr><td colspan="5">Gagal memuat data pengumuman.</td></tr>
      `;
      showMessage("Gagal mengambil data: " + error.message, true);
      return;
    }

    announcements = data || [];
    renderAnnouncements();
  }

  function renderAnnouncements() {
    if (!announcements.length) {
      table.innerHTML = `
        <tr><td colspan="5">Belum ada pengumuman.</td></tr>
      `;
      return;
    }

    table.innerHTML = announcements.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(item.title)}</td>
        <td>${escapeHTML(formatDate(item.published_at))}</td>
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
    formTitle.textContent = "Tambah Pengumuman";
    saveButton.textContent = "Simpan Pengumuman";
    cancelButton.hidden = true;
    showMessage("");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const isPublished = statusInput.value === "published";
    const id = idInput.value;

    if (!title || !content) {
      showMessage("Judul dan isi pengumuman wajib diisi.", true);
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Menyimpan...";
    showMessage("");

    try {
      const payload = {
        title,
        content,
        is_published: isPublished,
        published_at: isPublished
          ? (id
              ? announcements.find(item => item.id === id)?.published_at
                || new Date().toISOString()
              : new Date().toISOString())
          : null
      };

      let result;

      if (id) {
        result = await client
          .from("announcements")
          .update(payload)
          .eq("id", id);
      } else {
        result = await client
          .from("announcements")
          .insert(payload);
      }

      if (result.error) throw result.error;

      showMessage(
        isPublished
          ? "Pengumuman berhasil diterbitkan."
          : "Pengumuman berhasil disimpan sebagai draft."
      );

      resetForm();
      await loadAnnouncements();

    } catch (error) {
      showMessage("Gagal menyimpan: " + error.message, true);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Simpan Pengumuman";
    }
  });

  cancelButton.addEventListener("click", resetForm);

  table.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const item = announcements.find(entry => entry.id === id);

    if (!item) return;

    if (action === "edit") {
      idInput.value = item.id;
      titleInput.value = item.title;
      contentInput.value = item.content;
      statusInput.value = item.is_published ? "published" : "draft";

      formTitle.textContent = "Edit Pengumuman";
      saveButton.textContent = "Perbarui Pengumuman";
      cancelButton.hidden = false;

      showMessage("Mode edit aktif.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
      const confirmed = confirm(
        "Apakah Anda yakin ingin menghapus pengumuman ini?"
      );

      if (!confirmed) return;

      button.disabled = true;

      const { error } = await client
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) {
        showMessage("Gagal menghapus: " + error.message, true);
        button.disabled = false;
        return;
      }

      showMessage("Pengumuman berhasil dihapus.");
      await loadAnnouncements();
    }
  });

  async function initialize() {
    const allowed = await checkAccess();
    if (!allowed) return;

    await loadAnnouncements();
  }

  initialize().catch(error => {
    console.error(error);
    showMessage("Terjadi kesalahan: " + error.message, true);
  });
})();
