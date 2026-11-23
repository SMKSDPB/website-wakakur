
(function () {
  const client = window.supabaseClient;

  const form = document.getElementById("documentForm");
  const message = document.getElementById("documentMessage");
  const tableBody = document.getElementById("documentTableBody");
  const saveButton = document.getElementById("saveDocumentButton");
  const cancelButton = document.getElementById("cancelEditButton");

  const PUBLIC_BUCKET = "dokumen-publik";
  const INTERNAL_BUCKET = "dokumen-internal";
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  let documents = [];

  if (!client) {
    message.textContent = "Koneksi database belum tersedia.";
    return;
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#b00020" : "#247a35";
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

  function getAccess() {
    return document.querySelector(
      'input[name="documentAccess"]:checked'
    )?.value || "public";
  }

  // Hanya dokumen Publik + Terbit yang boleh masuk bucket publik.
  function getBucket(isPublic, isPublished) {
    return isPublic && isPublished
      ? PUBLIC_BUCKET
      : INTERNAL_BUCKET;
  }

  function splitFilePath(filePath) {
    if (!filePath || typeof filePath !== "string") {
      throw new Error("Lokasi file dokumen tidak valid.");
    }

    const separator = filePath.indexOf("/");

    if (separator < 1) {
      throw new Error("Lokasi file dokumen tidak valid.");
    }

    const bucket = filePath.substring(0, separator);
    const path = filePath.substring(separator + 1);

    if (
      ![PUBLIC_BUCKET, INTERNAL_BUCKET].includes(bucket) ||
      !path
    ) {
      throw new Error("Bucket atau lokasi file tidak dikenal.");
    }

    return { bucket, path };
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

  async function loadDocuments() {
    tableBody.innerHTML =
      '<tr><td colspan="6">Memuat dokumen...</td></tr>';

    const { data, error } = await client
      .from("documents")
      .select("id, title, description, category, file_path, is_public, is_published, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      tableBody.innerHTML =
        '<tr><td colspan="6">Gagal memuat dokumen.</td></tr>';
      showMessage("Gagal mengambil data: " + error.message, true);
      return;
    }

    documents = data || [];
    renderDocuments();
  }

  function renderDocuments() {
    if (!documents.length) {
      tableBody.innerHTML =
        '<tr><td colspan="6">Belum ada dokumen.</td></tr>';
      return;
    }

    tableBody.innerHTML = documents.map(function (item, index) {
      const access = item.is_public ? "Publik" : "Internal";
      const status = item.is_published ? "Terbit" : "Draft";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${escapeHTML(item.title)}</strong>
            <br>
            <small>${escapeHTML(item.description || "")}</small>
          </td>
          <td>${escapeHTML(item.category || "-")}</td>
          <td>${access}</td>
          <td>${status}</td>
          <td>
            <div class="document-actions">
              <button type="button"
                class="document-button secondary"
                data-action="open"
                data-id="${escapeHTML(item.id)}">
                Buka
              </button>

              <button type="button"
                class="document-button"
                data-action="edit"
                data-id="${escapeHTML(item.id)}">
                Edit
              </button>

              <button type="button"
                class="document-button danger"
                data-action="delete"
                data-id="${escapeHTML(item.id)}">
                Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function resetForm() {
    form.reset();
    document.getElementById("documentId").value = "";
    document.getElementById("formTitle").textContent = "Tambah Dokumen";
    document.getElementById("fileHelp").textContent =
      "Pilih file PDF. File wajib dipilih saat menambahkan dokumen.";
    saveButton.textContent = "Simpan Dokumen";
    cancelButton.hidden = true;
    showMessage("");
  }

  function validateFile(file) {
    if (!file) return;

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      throw new Error("File harus berformat PDF.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Ukuran file maksimal 50 MB.");
    }
  }

  function createStoragePath(fileName) {
    const safeName = fileName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    return Date.now() + "_" + crypto.randomUUID() + "_" + safeName;
  }

  async function uploadFile(file, bucket) {
    const path = createStoragePath(file.name);

    const { error } = await client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: false
      });

    if (error) throw error;

    return bucket + "/" + path;
  }

  async function removeStoredFile(filePath) {
    if (!filePath) return;

    const location = splitFilePath(filePath);

    const { error } = await client.storage
      .from(location.bucket)
      .remove([location.path]);

    if (error) throw error;
  }

  // Memindahkan file lama ke bucket tujuan tanpa meminta unggah ulang.
  async function migrateStoredFile(oldFilePath, targetBucket) {
    const oldLocation = splitFilePath(oldFilePath);

    if (oldLocation.bucket === targetBucket) {
      return oldFilePath;
    }

    const { data: fileBlob, error: downloadError } = await client.storage
      .from(oldLocation.bucket)
      .download(oldLocation.path);

    if (downloadError) throw downloadError;

    if (!fileBlob) {
      throw new Error("File lama tidak berhasil diunduh.");
    }

    const oldFileName = oldLocation.path.split("/").pop();
    const newPath = createStoragePath(oldFileName);

    const { error: uploadError } = await client.storage
      .from(targetBucket)
      .upload(newPath, fileBlob, {
        contentType: "application/pdf",
        upsert: false
      });

    if (uploadError) throw uploadError;

    return targetBucket + "/" + newPath;
  }

  async function openDocument(item) {
    if (!item.file_path) {
      showMessage("Dokumen belum memiliki file.", true);
      return;
    }

    try {
      const location = splitFilePath(item.file_path);
      let url;

      if (location.bucket === PUBLIC_BUCKET) {
        const result = client.storage
          .from(PUBLIC_BUCKET)
          .getPublicUrl(location.path);

        url = result.data.publicUrl;
      } else {
        const { data, error } = await client.storage
          .from(INTERNAL_BUCKET)
          .createSignedUrl(location.path, 60);

        if (error) throw error;
        url = data.signedUrl;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      showMessage("Gagal membuka dokumen: " + error.message, true);
    }
  }

  function editDocument(id) {
    const item = documents.find(function (doc) {
      return doc.id === id;
    });

    if (!item) return;

    document.getElementById("documentId").value = item.id;
    document.getElementById("documentTitle").value = item.title || "";
    document.getElementById("documentDescription").value =
      item.description || "";
    document.getElementById("documentCategory").value =
      item.category || "";
    document.getElementById("documentPublished").checked =
      item.is_published;

    document.querySelector(
      'input[name="documentAccess"][value="' +
      (item.is_public ? "public" : "internal") +
      '"]'
    ).checked = true;

    document.getElementById("formTitle").textContent = "Edit Dokumen";
    document.getElementById("fileHelp").textContent =
      "Kosongkan file jika tidak ingin mengganti PDF. Perubahan akses atau status akan memindahkan file otomatis.";

    saveButton.textContent = "Simpan Perubahan";
    cancelButton.hidden = false;

    showMessage("Mode edit: " + item.title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteDocument(id) {
    const item = documents.find(function (doc) {
      return doc.id === id;
    });

    if (!item) return;

    const confirmed = confirm(
      'Hapus dokumen "' + item.title + '" beserta file PDF-nya?'
    );

    if (!confirmed) return;

    try {
      const { error: deleteError } = await client
        .from("documents")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      try {
        await removeStoredFile(item.file_path);
      } catch (storageError) {
        showMessage(
          "Data dokumen terhapus, tetapi file penyimpanan gagal dihapus: " +
          storageError.message,
          true
        );
        await loadDocuments();
        return;
      }

      showMessage("Dokumen berhasil dihapus.");
      await loadDocuments();
    } catch (error) {
      showMessage("Gagal menghapus dokumen: " + error.message, true);
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = document.getElementById("documentId").value;
    const title = document.getElementById("documentTitle").value.trim();
    const description =
      document.getElementById("documentDescription").value.trim();
    const category = document.getElementById("documentCategory").value;
    const file = document.getElementById("documentFile").files[0];

    const access = getAccess();
    const isPublic = access === "public";
    const isPublished =
      document.getElementById("documentPublished").checked;

    const targetBucket = getBucket(isPublic, isPublished);

    let newFilePath = null;
    let oldFilePathToRemove = null;

    const oldDocument = id
      ? documents.find(function (doc) {
          return doc.id === id;
        })
      : null;

    try {
      if (!title) throw new Error("Judul dokumen wajib diisi.");
      if (!category) throw new Error("Kategori dokumen wajib dipilih.");

      validateFile(file);

      if (id && !oldDocument) {
        throw new Error("Data dokumen yang diedit tidak ditemukan.");
      }

      if (!id && !file) {
        throw new Error("Silakan pilih file PDF terlebih dahulu.");
      }

      saveButton.disabled = true;
      saveButton.textContent = "Menyimpan...";
      showMessage("Sedang memproses dokumen...");

      let filePath = oldDocument ? oldDocument.file_path : null;

      if (file) {
        // File baru langsung diunggah ke bucket sesuai status akhir.
        newFilePath = await uploadFile(file, targetBucket);
        filePath = newFilePath;

        if (oldDocument && oldDocument.file_path) {
          oldFilePathToRemove = oldDocument.file_path;
        }
      } else if (oldDocument && oldDocument.file_path) {
        // Jika akses/status berubah, pindahkan file lama otomatis.
        const oldLocation = splitFilePath(oldDocument.file_path);

        if (oldLocation.bucket !== targetBucket) {
          newFilePath = await migrateStoredFile(
            oldDocument.file_path,
            targetBucket
          );

          filePath = newFilePath;
          oldFilePathToRemove = oldDocument.file_path;
        }
      }

      const payload = {
        title: title,
        description: description,
        category: category,
        file_path: filePath,
        is_public: isPublic,
        is_published: isPublished
      };

      let result;

      if (id) {
        result = await client
          .from("documents")
          .update(payload)
          .eq("id", id)
          .select("id")
          .maybeSingle();
      } else {
        result = await client
          .from("documents")
          .insert(payload)
          .select("id")
          .maybeSingle();
      }

      if (result.error) throw result.error;

      if (!result.data) {
        throw new Error(
          "Data tidak tersimpan. Periksa hak akses database."
        );
      }

      // Hapus file lama hanya setelah perubahan database berhasil.
      if (oldFilePathToRemove) {
        try {
          await removeStoredFile(oldFilePathToRemove);
        } catch (storageError) {
          showMessage(
            "Data berhasil disimpan, tetapi file lama gagal dibersihkan: " +
            storageError.message,
            true
          );

          resetForm();
          await loadDocuments();
          return;
        }
      }

      showMessage(
        id
          ? "Dokumen berhasil diperbarui."
          : "Dokumen berhasil ditambahkan."
      );

      resetForm();
      await loadDocuments();

    } catch (error) {
      // Jika penyimpanan database gagal, hapus file baru agar tidak menjadi yatim.
      if (newFilePath) {
        try {
          await removeStoredFile(newFilePath);
        } catch (_) {
          // Jika gagal, file perlu diperiksa dan dibersihkan secara manual.
        }
      }

      showMessage("Gagal menyimpan dokumen: " + error.message, true);

    } finally {
      saveButton.disabled = false;
      saveButton.textContent = document.getElementById("documentId").value
        ? "Simpan Perubahan"
        : "Simpan Dokumen";
    }
  });

  tableBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "open") {
      const item = documents.find(function (doc) {
        return doc.id === id;
      });

      if (item) openDocument(item);
    }

    if (action === "edit") {
      editDocument(id);
    }

    if (action === "delete") {
      deleteDocument(id);
    }
  });

  cancelButton.addEventListener("click", resetForm);

  (async function initialize() {
    const authorized = await checkAccess();
    if (!authorized) return;

    await loadDocuments();
  })();
})();
