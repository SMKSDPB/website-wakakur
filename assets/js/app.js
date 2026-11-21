(function(){
  const data = window.WAKAKUR_DATA || {announcements:[],events:[],calendar:{year:2026,month:10,markedDays:[]}};
  const $ = (id) => document.getElementById(id);
  const today = new Date();
  if ($("todayDate")) $("todayDate").textContent = new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(today);
  if ($("year")) $("year").textContent = today.getFullYear();

  const announcementList = $("announcementList");
  if (announcementList) {
    announcementList.innerHTML = data.announcements.length ? data.announcements.map(item => `
      <article class="announcement-card">
        <span class="tag">${escapeHTML(item.category)}</span>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.summary)}</p>
        <time>${escapeHTML(item.date)}</time>
      </article>`).join("") : '<div class="empty-state"><strong>Belum ada pengumuman terbaru.</strong><p>Pengumuman resmi akan ditampilkan pada bagian ini setelah diterbitkan oleh bidang kurikulum.</p></div>';
  }

  const agendaList = $("agendaList");
  if (agendaList) {
    agendaList.innerHTML = data.events.length ? data.events.map(item => `
      <div class="agenda-item">
        <div class="agenda-date"><strong>${escapeHTML(item.day)}</strong><small>${escapeHTML(item.month)}</small></div>
        <div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.detail)}</p></div>
      </div>`).join("") : '<div class="empty-state compact"><strong>Agenda belum dipublikasikan.</strong><p>Periksa kembali halaman ini untuk pembaruan kegiatan sekolah.</p></div>';
  }

  const cal = data.calendar;
  if ($("calendarMonth")) $("calendarMonth").textContent = new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(cal.year,cal.month,1));
  const dates = $("calendarDates");
  if (dates) {
    const firstDay = new Date(cal.year,cal.month,1).getDay();
    const daysInMonth = new Date(cal.year,cal.month+1,0).getDate();
    const cells = [];
    for(let i=0;i<firstDay;i++) cells.push('<span class="muted-date">·</span>');
    for(let day=1;day<=daysInMonth;day++){
      const marked = cal.markedDays.includes(day) ? "has-event" : "";
      cells.push(`<span class="${marked}">${day}</span>`);
    }
    dates.innerHTML = cells.join("");
  }

  const toggle = $("menuToggle"), nav = $("mainNav");
  if(toggle && nav){
    toggle.addEventListener("click",()=>{
      const opened = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded",String(opened));
      toggle.setAttribute("aria-label",opened ? "Tutup navigasi" : "Buka navigasi");
    });
    nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
      nav.classList.remove("open"); toggle.setAttribute("aria-expanded","false");
    }));
  }

  function escapeHTML(value){
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
})();
