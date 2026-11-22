
(function () {
  const data = window.WAKAKUR_DATA || {
    announcements: [],
    events: [],
    calendar: { year: 2026, month: 10, markedDays: [] }
  };

  const $ = (id) => document.getElementById(id);
  const today = new Date();

  if ($("todayDate")) {
    $("todayDate").textContent = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(today);
  }

  if ($("year")) {
    $("year").textContent = today.getFullYear();
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

  function getDateParts(value) {
    if (!value) return null;

    const parts = String(value).slice(0, 10).split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      return null;
    }

    return {
      year: parts[0],
      month: parts[1],
      day: parts[2]
    };
  }

  function formatDate(value) {
    const parts = getDateParts(value);
    if (!parts) return "";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date(parts.year, parts.month - 1, parts.day));
  }

  function renderAnnouncements(items) {
    const list = $("announcementList");
    if (!list) return;

    list.innerHTML = items.length
      ? items.map(item => `
        <article class="announcement-card">
          <span class="tag">${escapeHTML(item.category || "Pengumuman")}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.summary ?? item.content)}</p>
          <time>${escapeHTML(item.date || formatDate(item.published_at))}</time>
        </article>
      `).join("")
      : `
        <div class="empty-state">
          <strong>Belum ada pengumuman terbaru.</strong>
          <p>Pengumuman resmi akan ditampilkan pada bagian ini setelah diterbitkan oleh bidang kurikulum.</p>
        </div>
      `;
  }

  function renderAgenda(items) {
    const list = $("agendaList");
    if (!list) return;

    list.innerHTML = items.length
      ? items.map(item => {
          const parts = getDateParts(item.start_date);

          const day = item.day || (parts ? parts.day : "-");
          const month = item.month || (
            parts
              ? new Intl.DateTimeFormat("id-ID", {
                  month: "short"
                }).format(new Date(parts.year, parts.month - 1, parts.day))
              : ""
          );

          return `
            <div class="agenda-item">
              <div class="agenda-date">
                <strong>${escapeHTML(day)}</strong>
                <small>${escapeHTML(month)}</small>
              </div>
              <div>
                <strong>${escapeHTML(item.title)}</strong>
                <p>${escapeHTML(item.detail ?? item.description)}</p>
              </div>
            </div>
          `;
        }).join("")
      : `
        <div class="empty-state compact">
          <strong>Agenda belum dipublikasikan.</strong>
          <p>Periksa kembali halaman ini untuk pembaruan kegiatan sekolah.</p>
        </div>
      `;
  }

  function renderCalendar(events) {
    const cal = data.calendar || {
      year: today.getFullYear(),
      month: today.getMonth(),
      markedDays: []
    };

    const year = cal.year;
    const month = cal.month;

    if ($("calendarMonth")) {
      $("calendarMonth").textContent =
        new Intl.DateTimeFormat("id-ID", {
          month: "long",
          year: "numeric"
        }).format(new Date(year, month, 1));
    }

    const dates = $("calendarDates");
    if (!dates) return;

    const markedDays = new Set(cal.markedDays || []);

    events.forEach(event => {
      const start = getDateParts(event.start_date);
      const end = getDateParts(event.end_date || event.start_date);

      if (!start) return;

      const last = end || start;

      let current = new Date(
        start.year,
        start.month - 1,
        start.day
      );

      const finish = new Date(
        last.year,
        last.month - 1,
        last.day
      );

      while (current <= finish) {
        if (
          current.getFullYear() === year &&
          current.getMonth() === month
        ) {
          markedDays.add(current.getDate());
        }

        current.setDate(current.getDate() + 1);
      }
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push('<span class="muted-date">·</span>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const marked = markedDays.has(day) ? "has-event" : "";

      cells.push(
        `<span class="${marked}">${day}</span>`
      );
    }

    dates.innerHTML = cells.join("");
  }

  async function loadPublicData() {
    let announcements = data.announcements || [];
    let events = data.events || [];

    if (window.supabaseClient) {
      const [announcementResult, eventResult] = await Promise.all([
        window.supabaseClient
          .from("announcements")
          .select("title, content, published_at, is_published")
          .eq("is_published", true)
          .order("published_at", { ascending: false }),

        window.supabaseClient
          .from("academic_events")
          .select("title, description, start_date, end_date, is_published")
          .eq("is_published", true)
          .order("start_date", { ascending: true })
      ]);

      if (announcementResult.error) {
        console.error(
          "Gagal mengambil pengumuman:",
          announcementResult.error
        );
      } else {
        announcements = announcementResult.data || [];
      }

      if (eventResult.error) {
        console.error(
          "Gagal mengambil agenda:",
          eventResult.error
        );
      } else {
        events = eventResult.data || [];
      }
    }

    renderAnnouncements(announcements);
    renderAgenda(events);
    renderCalendar(events);
  }

  // Navigasi seluler
  const toggle = $("menuToggle");
  const nav = $("mainNav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const opened = nav.classList.toggle("open");

      toggle.setAttribute("aria-expanded", String(opened));
      toggle.setAttribute(
        "aria-label",
        opened ? "Tutup navigasi" : "Buka navigasi"
      );
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Tampilkan data awal dan ambil data terbaru dari Supabase
  loadPublicData().catch(error => {
    console.error("Kesalahan memuat data website:", error);

    renderAnnouncements(data.announcements || []);
    renderAgenda(data.events || []);
    renderCalendar(data.events || []);
  });
})();
