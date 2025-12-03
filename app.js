document.addEventListener("DOMContentLoaded", () => {
  const state = { mensajes: [], selectedId: null, dark: false };

  // Elementos
  const inboxEl = document.getElementById("inbox-list");
  const detailEl = document.getElementById("detail-pane");

  // Metricas
  const headerTotal = document.getElementById("header-total");
  const headerUrgent = document.getElementById("header-urgent");
  const metricTotal = document.getElementById("metric-total");
  const metricUrgent = document.getElementById("metric-urgent");
  const metricGeneral = document.getElementById("metric-general"); // NUEVO
  const metricAvg = document.getElementById("metric-avg");

  // Filtros
  const searchInput = document.getElementById("search-input");
  const filterCanal = document.getElementById("filter-canal");
  const filterCategoria = document.getElementById("filter-categoria");
  const btnClearFilters = document.getElementById("btn-clear-filters");
  const sortBy = document.getElementById("sort-by");
  const pageSize = document.getElementById("page-size");

  // Modales
  const composeModal = document.getElementById("compose-modal");
  const btnOpenCompose = document.getElementById("btn-open-compose");
  const btnComposeCancel = document.getElementById("compose-cancel");
  const btnComposeSend = document.getElementById("compose-send");
  const composeCanal = document.getElementById("compose-canal");
  const composeUsuario = document.getElementById("compose-usuario");
  const composeMensaje = document.getElementById("compose-mensaje");

  const assignModal = document.getElementById("assign-modal");
  const btnAssignCancel = document.getElementById("assign-cancel");
  const agentButtons = document.querySelectorAll(".btn-agent");

  const btnAssign = document.getElementById("btn-assign");
  const btnMarkRead = document.getElementById("btn-mark-read");
  const btnAttended = document.getElementById("btn-attended");
  const btnExport = document.getElementById("btn-export");
  
  const toggleDark = document.getElementById("toggle-dark");
  const themeLabel = document.getElementById("themeLabel");

  function uid() { return Math.random().toString(36).slice(2, 9); }
  function nowISO() { return new Date().toISOString(); }

  // IA Clasificación
  function classifyText(text) {
    const t = text.toLowerCase();
    if (/(reclamo|queja|problema|no funciona|urgente|error|fallo|no llega|malo)/.test(t)) return { cat: "Urgente", tag: "urgent" };
    if (/(precio|cotiz|costo|cuánto|presupuesto|info|solicito)/.test(t)) return { cat: "Consulta", tag: "consulta" };
    if (/(gracias|excelente|buen servicio|satisfecho|ok|bien)/.test(t)) return { cat: "Feedback", tag: "feedback" };
    return { cat: "General", tag: "general" };
  }

  function createMensaje(canal, usuario, texto) {
    const cls = classifyText(texto);
    return {
      id: uid(),
      canal,
      usuario,
      texto,
      categoria: cls.cat,
      tag: cls.tag,
      created_at: nowISO(),
      assigned: null,
      read: false,
      atendido: false
    };
  }

  function renderList() {
    let arr = [...state.mensajes];
    
    // Filtrar
    const q = searchInput.value.trim().toLowerCase();
    if (q) arr = arr.filter(m => (m.texto + ' ' + m.usuario).toLowerCase().includes(q));
    const fc = filterCanal.value;
    if (fc) arr = arr.filter(m => m.canal === fc);
    const fcat = filterCategoria.value;
    if (fcat) arr = arr.filter(m => m.categoria === fcat);

    // Ordenar
    if (sortBy.value === "new") arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy.value === "old") arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sortBy.value === "urgent") arr.sort((a, b) => (b.categoria === "Urgente") - (a.categoria === "Urgente"));

    const limit = parseInt(pageSize.value || "10", 10);
    arr = arr.slice(0, limit);

    inboxEl.innerHTML = "";
    if (!arr.length) {
      inboxEl.innerHTML = `<div class="card"><p class="muted">No hay mensajes con esos filtros.</p></div>`;
      renderMetrics();
      return;
    }

    arr.forEach(m => {
      const item = document.createElement("div");
      item.className = `item ${m.tag}`;
      if (m.atendido) item.classList.add("atendido");
      if (state.selectedId === m.id) item.style.background = "var(--bg)";
      
      item.innerHTML = `
        <div style="flex:1">
          <h4>${m.usuario} <span style="font-weight:400; font-size:12px; color:var(--muted)">· ${m.canal}</span></h4>
          <p>${m.texto.length > 90 ? m.texto.slice(0, 90) + "..." : m.texto}</p>
        </div>
        <div style="text-align:right">
          <div class="tag ${m.tag}">${m.categoria}</div>
          <div style="font-size:11px; color:var(--muted); margin-top:4px">
             ${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      `;
      item.addEventListener("click", () => selectMessage(m.id));
      inboxEl.appendChild(item);
    });

    renderMetrics();
  }

  function selectMessage(id) {
    state.selectedId = id;
    const m = state.mensajes.find(x => x.id === id);
    if (!m) return;
    if(!m.read) { m.read = true; }

    detailEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:12px;">
        <h3 style="margin:0">${m.usuario}</h3>
        <span class="tag ${m.tag}" style="font-size:12px">${m.categoria}</span>
      </div>

      <div class="field">
        <span class="field-label">Canal</span>
        <span class="field-value">${m.canal}</span>
      </div>

      <div class="field">
        <span class="field-label">Mensaje</span>
        <p class="field-value" style="background:rgba(0,0,0,0.03); padding:12px; border-radius:8px;">${m.texto}</p>
      </div>

      <div class="field">
        <span class="field-label">Estado</span>
        <span class="field-value">
          ${m.atendido ? '✅ Atendido' : '⏳ Pendiente'} 
          ${m.read ? '(Leído)' : ''}
        </span>
      </div>

      <div class="field">
        <span class="field-label">Asignado a</span>
        <span class="field-value" style="font-weight:bold; color:var(--primary)">
          ${m.assigned ? `<span style="display:inline-block; width:8px; height:8px; background:green; border-radius:50%"></span> ${m.assigned}` : '🚫 Sin asignar'}
        </span>
      </div>

      <div class="field">
        <span class="field-label">Fecha</span>
        <span class="field-value">${new Date(m.created_at).toLocaleString()}</span>
      </div>
    `;
    renderList();
  }

  function renderMetrics() {
    const total = state.mensajes.length;
    const urgent = state.mensajes.filter(m => m.categoria === "Urgente").length;
    // Generales + Consultas + Feedback (todo lo que no es urgente)
    const generals = total - urgent; 
    
    if(headerTotal) headerTotal.innerText = total;
    if(headerUrgent) headerUrgent.innerText = urgent;

    if(metricTotal) metricTotal.innerText = total;
    if(metricUrgent) metricUrgent.innerText = urgent;
    if(metricGeneral) metricGeneral.innerText = generals; // Muestra el resto
    if(metricAvg) metricAvg.innerText = total ? Math.round((urgent / total) * 100) + '%' : '0%';
  }

  // Event Listeners
  btnAssign.addEventListener("click", () => {
    if (!state.selectedId) return alert("Selecciona un mensaje primero");
    assignModal.classList.remove("hidden");
  });
  
  btnAssignCancel.addEventListener("click", () => assignModal.classList.add("hidden"));

  agentButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const agent = btn.dataset.agent;
      const m = state.mensajes.find(x => x.id === state.selectedId);
      if(m) {
        m.assigned = agent;
        selectMessage(state.selectedId);
        renderList(); 
      }
      assignModal.classList.add("hidden");
    });
  });

  btnMarkRead.addEventListener("click", () => {
    if (!state.selectedId) return;
    const m = state.mensajes.find(x => x.id === state.selectedId);
    m.read = true; renderList(); selectMessage(state.selectedId);
  });

  btnAttended.addEventListener("click", () => {
    if (!state.selectedId) return alert("Selecciona mensaje");
    const m = state.mensajes.find(x => x.id === state.selectedId);
    m.atendido = !m.atendido; renderList(); selectMessage(state.selectedId);
  });

  btnExport.addEventListener("click", () => {
    if (!state.mensajes.length) return alert("Nada que exportar");
    const csv = "data:text/csv;charset=utf-8," 
      + ["ID,Canal,Usuario,Categoria,Mensaje"].join(",") + "\n"
      + state.mensajes.map(m => `${m.id},${m.canal},${m.usuario},${m.categoria},"${m.texto}"`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "smartinbox.csv";
    link.click();
  });

  btnOpenCompose.addEventListener("click", () => composeModal.classList.remove("hidden"));
  btnComposeCancel.addEventListener("click", () => composeModal.classList.add("hidden"));
  
  btnComposeSend.addEventListener("click", () => {
    const canal = composeCanal.value;
    const user = composeUsuario.value.trim() || "Anónimo";
    const text = composeMensaje.value.trim();
    if(!text) return alert("Falta mensaje");
    state.mensajes.unshift(createMensaje(canal, user, text));
    composeModal.classList.add("hidden");
    composeUsuario.value = ""; composeMensaje.value = "";
    renderList();
  });

  [searchInput, filterCanal, filterCategoria, sortBy, pageSize].forEach(el => el.addEventListener("input", renderList));
  
  btnClearFilters.addEventListener("click", () => {
    searchInput.value = ""; filterCanal.value = ""; filterCategoria.value = "";
    renderList();
  });

  document.querySelectorAll(".chip").forEach(ch => {
    ch.addEventListener("click", () => {
      filterCanal.value = ch.dataset.canal;
      renderList();
    });
  });

  toggleDark.addEventListener("change", (e) => {
    state.dark = e.target.checked;
    document.body.classList.toggle("dark", state.dark);
    themeLabel.innerText = state.dark ? "Claro" : "Modo oscuro";
  });

  function seedDemo() {
    state.mensajes = [
      createMensaje("WhatsApp", "Carlos Gomez", "URGENTE: Mi pedido no ha llegado y lo necesito hoy."),
      createMensaje("Gmail", "Ana.Lopez@empresa.com", "Solicito cotización para el plan Enterprise."),
      createMensaje("Telegram", "Soporte TI", "El servidor está respondiendo lento, favor revisar."),
      createMensaje("Facebook", "Lucía Mendez", "Hola, me encantó la atención recibida ayer, gracias."),
      createMensaje("Formulario", "Juan Perez", "Tengo una duda sobre la facturación del mes pasado."),
    ];
    renderList();
  }

  seedDemo();
});