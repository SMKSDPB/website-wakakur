
(function () {
  const client = window.supabaseClient;

  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const button = document.getElementById("loginButton");

  if (!client) {
    message.textContent = "Koneksi database belum tersedia.";
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    button.disabled = true;
    button.textContent = "Memeriksa...";
    message.textContent = "";

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || !profile.is_active) {
        throw new Error("Akun tidak aktif atau profil tidak ditemukan.");
      }

      let destination;

      if (["admin", "wakakur"].includes(profile.role)) {
        destination = "dashboard-admin.html";
      } else if (profile.role === "guru") {
        destination = "jadwal-guru.html";
      } else {
        throw new Error("Role akun tidak dikenali.");
      }

      message.textContent = "Login berhasil. Mengalihkan halaman...";
      window.location.replace(destination);

    } catch (error) {
      await client.auth.signOut();
      message.textContent = error.message || "Login gagal.";
    } finally {
      button.disabled = false;
      button.textContent = "Masuk";
    }
  });
})();
