document.addEventListener("DOMContentLoaded", () => {
    // Add animation initialization
    const enterBtn = document.querySelector('.enter-btn');
    const btnContainer = document.querySelector('.btn-container');

    // Initial animations
    gsap.from(".logo", {
        duration: 2,
        opacity: 0,
        y: -100,
        ease: "power4.out"
    });

    gsap.from(btnContainer, {
        duration: 1.5,
        opacity: 0,
        y: 30,
        ease: "power4.out",
        delay: 1
    });

    // Button hover effects
    enterBtn.addEventListener('mouseenter', () => {
        gsap.to(enterBtn, {
            scale: 1.05,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    enterBtn.addEventListener('mouseleave', () => {
        gsap.to(enterBtn, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    // Button click animation
    enterBtn.addEventListener('click', function(e) {
        gsap.to(this, {
            scale: 0.95,
            duration: 0.1,
            onComplete: () => {
                gsap.to(this, {
                    scale: 1,
                    duration: 0.2,
                    ease: "elastic.out(1, 0.5)"
                });
            }
        });

        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = e.clientX - rect.left - size/2 + 'px';
        ripple.style.top = e.clientY - rect.top - size/2 + 'px';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 1000);
    });

    // helper : récupérer la meilleure URL d'image possible
    function getCoverUrl(item) {
    return item.cover_url || item.image_url || item.cover || item.coverUrl || item.image || "";
  }

  // create modal once
  function createModalIfNeeded() {
    if (document.getElementById("song-modal")) return;
    const modal = document.createElement("div");
    modal.id = "song-modal";
    // inline styles pour éviter soucis de CSS manquant
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.85)";
    modal.style.display = "none"; // caché tant que non utilisé
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "9999";

    modal.innerHTML = `
      <div id="modal-inner" style="background:#1e1e1e; padding:28px; border-radius:16px; text-align:center; position:relative; max-width:520px; width:92%;">
        <button id="close-modal" aria-label="Fermer" style="position:absolute; top:12px; right:14px; cursor:pointer; background:transparent; border:none; color:#fff; font-size:28px;">&times;</button>
        <img id="modal-cover" src="" alt="cover" style="width:220px; height:220px; border-radius:12px; object-fit:cover; margin-bottom:18px;">
        <div id="modal-title" style="font-size:20px; font-weight:700; color:#1db954; margin-bottom:8px;"></div>
        <div id="modal-artist" style="color:#ccc; margin-bottom:8px;"></div>
        <div id="modal-streams" style="color:#999; font-size:14px;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // close handlers
    document.getElementById("close-modal").addEventListener("click", () => {
      modal.style.display = "none";
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  // ouvrir modal en remplissant les champs
  function openSongModal(song) {
    createModalIfNeeded();
    const modal = document.getElementById("song-modal");
    document.getElementById("modal-cover").src = song.cover;
    document.getElementById("modal-title").textContent = song.track_name;
    document.getElementById("modal-artist").textContent = song["artist(s)_name"] || song.artist || "";
    document.getElementById("modal-streams").textContent = Number(song.streams || 0).toLocaleString() + " streams";
    modal.style.display = "flex";
  }

  // parse CSV
  if (typeof Papa === "undefined") {
    console.error("PapaParse non trouvé — vérifie que le script PapaParse est inclus avant ce script.");
    return;
  }

  Papa.parse("Spotify Most Streamed Songs.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      console.log("PapaParse terminé, lignes:", results.data.length);
      const raw = results.data || [];

      // construire data propre avec id, cover, streams numérique
      const data = raw.map((d, i) => {
        const cover = getCoverUrl(d);
        const streamsRaw = (d.streams === undefined || d.streams === null) ? "0" : String(d.streams);
        const streamsNum = parseInt(streamsRaw.replace(/[^0-9]/g, ""), 10) || 0;
        return {
          ...d,
          id: i,
          cover,
          streams: streamsNum
        };
      }).filter(d => d.track_name && d.streams && d.cover);

      if (!data.length) {
        console.warn("Aucune chanson valide trouvée (vérifie les entêtes CSV et les colonnes cover_url/streams/track_name).");
      }

      // mapping id -> song
      window.__songsById = {};
      data.forEach(s => window.__songsById[s.id] = s);

      // initial render
      renderSongs(data);
      renderChart(data);
      setupSearch(data);

      console.log("Données prêtes:", data.length, "chansons affichables.");
    },
    error: function(err) {
      console.error("Erreur PapaParse:", err);
    }
  });

  // RENDERS

  function renderSongs(data) {
    const container = document.getElementById("songs-container");
    if (!container) {
      console.error("#songs-container introuvable dans le DOM.");
      return;
    }
    container.innerHTML = "";

    data.slice(0, 50).forEach((song, idx) => {
      const card = document.createElement("div");
      card.className = "song-card";
      card.dataset.id = song.id; // pour retrouver la chanson
      card.innerHTML = `
        <img src="${song.cover}" alt="cover">
        <div class="song-info">
          <div class="title">${song.track_name}</div>
          <div class="artist">${song["artist(s)_name"] || ""}</div>
          <div class="streams">${Number(song.streams).toLocaleString()} streams</div>
        </div>
      `;
      container.appendChild(card);

      // animation cascade
      setTimeout(() => card.classList.add("visible"), idx * 45);
    });

    // délégation : un seul listener pour tout le container (plus fiable)
    container.removeEventListener("click", container.__clickHandler); // remove previous if any
    container.__clickHandler = function(e) {
      const card = e.target.closest(".song-card");
      if (!card) return;
      const id = card.dataset.id;
      const song = window.__songsById[id];
      if (!song) {
        console.error("Chanson introuvable pour id:", id);
        return;
      }
      openSongModal(song);
    };
    container.addEventListener("click", container.__clickHandler);
  }

  // Chart (Top 10)
  function renderChart(data) {
    const sorted = (data || []).slice().sort((a,b) => b.streams - a.streams).slice(0,10);
    const canvas = document.getElementById("chart");
    if (!canvas) {
      console.warn("#chart introuvable — le Top 10 ne sera pas affiché.");
      return;
    }
    const ctx = canvas.getContext("2d");
    try {
      // destroy existing chart if any (prévenir doublons)
      if (window.__top10Chart) {
        window.__top10Chart.destroy();
      }
    } catch (e) { /* ignore */ }

    window.__top10Chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(s => s.track_name),
        datasets: [{
          label: "Streams",
          data: sorted.map(s => s.streams),
          backgroundColor: sorted.map(() => "#1db954"),
          borderRadius: 10,
          hoverBackgroundColor: "#1ed760"
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        animation: { duration: 1200, easing: 'linear', onComplete: launchSparkles },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => Number(ctx.raw).toLocaleString() + " streams" } }
        },
        scales: { x: { ticks: { callback: value => value.toLocaleString() } } }
      }
    });
  }

  // sparkles
  function launchSparkles() {
    const container = document.getElementById("sparkles");
    if (!container) return;
    for (let i=0;i<18;i++){
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.position = 'absolute';
      s.style.left = Math.random()*100 + '%';
      s.style.top = Math.random()*100 + '%';
      s.style.width = (Math.random()*6+4) + 'px';
      s.style.height = s.style.width;
      s.style.borderRadius = '50%';
      s.style.background = `hsl(${Math.random()*360},100%,70%)`;
      s.style.pointerEvents = 'none';
      s.style.animation = 'sparkle 900ms ease-out forwards';
      container.appendChild(s);
      setTimeout(()=>s.remove(), 900);
    }
  }

  // search
  function setupSearch(data) {
    const input = document.getElementById("search");
    if (!input) {
      console.warn("#search introuvable.");
      return;
    }
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        renderSongs(data);
        return;
      }
      const filtered = data.filter(s =>
        (s.track_name && s.track_name.toLowerCase().includes(q)) ||
        ((s["artist(s)_name"] || s.artist || "").toLowerCase().includes(q))
      );
      renderSongs(filtered);
    });
  }

}); // DOMContentLoaded end
