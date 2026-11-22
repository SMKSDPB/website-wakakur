
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
        .select("full_name, role, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (
        !profile ||
        !profile.is_active ||
        !["admin", "wakakur"].includes(profile.role)
      ) {
        await client.auth.signOut();
        throw new Error("Akun tidak memiliki hak akses pengelola.");
      }

      message.textContent = "Login berhasil. Membuka dashboard...";

      window.location.href = "dashboard-admin.html";

    } catch (error) {
      message.textContent = error.message || "Login gagal.";
      await client.auth.signOut();
    } finally {
      button.disabled = false;
      button.textContent = "Masuk";
    }
  });
})();
