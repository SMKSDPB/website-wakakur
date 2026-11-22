
(async function () {
  const client = window.supabaseClient;

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
    return;
  }

  document.getElementById("adminName").textContent =
    profile.full_name || user.email;

  document.getElementById("adminRole").textContent =
    profile.role.toUpperCase();

  const logoutButton = document.getElementById("logoutButton");

  logoutButton.addEventListener("click", async function () {
    logoutButton.disabled = true;
    logoutButton.textContent = "Keluar...";

    const { error } = await client.auth.signOut();

    if (error) {
      logoutButton.disabled = false;
      logoutButton.textContent = "Keluar";
      alert("Gagal keluar. Silakan coba kembali.");
      return;
    }

    window.location.replace("admin.html");
  });
})();
