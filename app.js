// Simple SPA logic for SmartInbox demo UI
// - Simula llegada desde varios canales
// - Clasifica con reglas simples
// - Muestra lista, detalle y métricas
// - Export CSV y filtros

document.addEventListener("DOMContentLoaded", () => {
  // state
  const state = {
    mensajes: [],
    selectedId: null
  };

  // elements
  const inboxEl = document.getElementById("inbox-list");
  const detailEl = document.getElementById("detail-pane");
  const totalCountEl = document.getElementById("total-count");
  const urgentCountEl = document.getElementById("urgent-count");
  const generalCountEl = document.getElementById("general-count");
  const metricTotal = document.getElementById("metric-total");
  const metricUrgent = document.getElementById("metric-urgent");
  const metricAvg = document.getElementById("metric-avg");

  // compose modal controls
  const composeModal = document.getElementById("compose-modal");
  const btnOpenCompose = document.getElementById("btn-open-compose");
  const btnCancel = document.getElementById("compose-cancel");
  const btnSend = document.getElementById("compose-send");
  const composeCanal = document.getElementById("compose-canal");
  const composeUsuario = document.getElementById("compose-usuario");
  const composeMensaje = document.getElementById("compose-mensaje");

  // filters
  const searchInput = document.getElementById("search-input");
  const filterCanal = document.getElementById("filter-canal");
  const filterCategoria = document.getElementById("filter-categoria");
  const btnClearFilters = document.getElementById("btn-clear-filters");
  const sortBy = document.getElementById("sort-by");
  const pageSize = document.getElementById("page-size");

  // assign/export buttons
  const btnAssign = document.getElementById("btn-assign");
  const btnMarkRead = document.getElementById("btn-mark-read");
  const btnExport = document.getElementById("btn-export");

  // utilities
  function uid() { return Math.random().toString(36).slice(2,9); }
  function nowISO(){ return new Date().toISOString(); }

  // classifier rules (simple)
  function classifyText(text){
    const t = text.toLowerCase();
    if (/(reclamo|queja|problema|no funciona|urgente|error|fallo|no llega)/.test(t)) return {cat:"Urgente", tag:"urgent"};
    if (/(precio|cotiz|costo|precio|cuánto|presupuesto|solicito)/.test(t)) return {cat:"Consulta", tag:"consulta"};
    if (/(gracias|excelente|buen servicio|satisfecho)/.test(t)) return {cat:"Feedback", tag:"feedback"};
    return {cat:"General", tag:"general"};
  }

  // create message object
  function createMensaje(canal, usuario, texto){
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
      read: false
    };
  }

  // render list
  function renderList(){
    // apply filters
    let arr = [...state.mensajes];
    const q = searchInput.value.trim().toLowerCase();
    if (q) arr = arr.filter(m => (m.texto + ' ' + m.usuario).toLowerCase().includes(q));
    const fc = filterCanal.value;
    if (fc) arr = arr.filter(m => m.canal === fc);
    const fcat = filterCategoria.value;
    if (fcat) arr = arr.filter(m => m.categoria === fcat);

    // sorting
    if (sortBy.value === "new") arr.sort((a,b)=> b.created_at.localeCompare(a.created_at));
    else if (sortBy.value === "old") arr.sort((a,b)=> a.created_at.localeCompare(b.created_at));
    else if (sortBy.value === "urgent") arr.sort((a,b)=> (b.categoria === "Urgente") - (a.categoria === "Urgente"));

    // page size (not paginated, just limit)
    const limit = parseInt(pageSize.value || "10",10);
    arr = arr.slice(0, limit);

    inboxEl.innerHTML = "";
    if (!arr.length){
      inboxEl.innerHTML = `<div class="card"><p class="muted">No hay mensajes con esos filtros.</p></div>`;
      renderMetrics();
      return;
    }

    arr.forEach(m => {
      const item = document.createElement("div");
      item.className = `item ${m.tag}`;
      item.dataset.id = m.id;
      item.innerHTML = `
        <div class="meta">
          <h4>${m.usuario} <small style="color:var(--muted);font-weight:500">· ${m.canal}</small></h4>
          <p>${m.texto}</p>
        </div>
        <div class="right">
          <div class="tag ${m.tag}">${m.categoria}</div>
          <small style="color:var(--muted)">${new Date(m.created_at).toLocaleString()}</small>
        </div>
      `;
      item.addEventListener("click", ()=> selectMessage(m.id));
      inboxEl.appendChild(item);
    });

    renderMetrics();
  }

  function selectMessage(id){
    const m = state.mensajes.find(x=>x.id===id);
    if (!m) return;
    state.selectedId = id;
    detailEl.innerHTML = `
      <div><b>Usuario:</b> ${m.usuario}</div>
      <div><b>Canal:</b> ${m.canal}</div>
      <div style="margin-top:8px"><b>Categoría IA:</b> <span class="tag ${m.tag}">${m.categoria}</span></div>
      <div style="margin-top:12px"><b>Mensaje:</b><p style="margin:6px 0;color:var(--muted)">${m.texto}</p></div>
      <div style="margin-top:10px"><b>Asignado a:</b> ${m.assigned || '<i>ninguno</i>'}</div>
      <div style="margin-top:10px"><b>Recibido:</b> ${new Date(m.created_at).toLocaleString()}</div>
    `;
  }

  // metrics
  function renderMetrics(){
    const total = state.mensajes.length;
    const urgent = state.mensajes.filter(m=>m.categoria==="Urgente").length;
    const general = state.mensajes.filter(m=>m.categoria==="General").length;
    totalCountEl.innerText = total;
    urgentCountEl.innerText = urgent;
    generalCountEl.innerText = general;

    metricTotal.innerText = total;
    metricUrgent.innerText = urgent;
    metricAvg.innerText = total ? Math.round((urgent/total)*100) + '%' : '0%';
  }

  // actions: assign / mark read / export
  btnAssign.addEventListener("click", ()=>{
    if (!state.selectedId) return alert("Selecciona un mensaje primero");
    const user = prompt("Asignar a (nombre del agente):");
    if (!user) return;
    const m = state.mensajes.find(x=>x.id===state.selectedId);
    m.assigned = user;
    selectMessage(state.selectedId);
    renderList();
  });

  btnMarkRead.addEventListener("click", ()=>{
    if (!state.selectedId) return alert("Selecciona un mensaje primero");
    const m = state.mensajes.find(x=>x.id===state.selectedId);
    m.read = true;
    renderList();
    selectMessage(state.selectedId);
  });

  btnExport.addEventListener("click", ()=>{
    if (!state.mensajes.length) return alert("No hay mensajes para exportar");
    const csv = [
      ["id","canal","usuario","categoria","texto","created_at","assigned"].join(","),
      ...state.mensajes.map(m => [m.id,m.canal,m.usuario,m.categoria,`"${m.texto.replace(/"/g,'""')}"`,m.created_at,m.assigned||""].join(","))
    ].join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `smartinbox_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // compose modal
  btnOpenCompose.addEventListener("click", ()=> composeModal.classList.remove("hidden"));
  btnCancel.addEventListener("click", ()=> composeModal.classList.add("hidden"));

  btnSend.addEventListener("click", ()=>{
    const canal = composeCanal.value;
    const usuario = composeUsuario.value.trim() || "Anon";
    const texto = composeMensaje.value.trim();
    if (!texto) return alert("Escribe un mensaje");
    const m = createMensaje(canal, usuario, texto);
    state.mensajes.unshift(m);
    composeModal.classList.add("hidden");
    composeUsuario.value = ""; composeMensaje.value = "";
    renderList();
  });

  // quick-add by clicking channel chips
  document.querySelectorAll(".chip").forEach(ch => {
    ch.addEventListener("click", ()=>{
      composeModal.classList.remove("hidden");
      composeCanal.value = ch.dataset.canal;
    });
  });

  // filters events
  [searchInput, filterCanal, filterCategoria, sortBy, pageSize].forEach(el => el.addEventListener("input", renderList));
  btnClearFilters.addEventListener("click", ()=>{
    searchInput.value=""; filterCanal.value=""; filterCategoria.value="";
    renderList();
  });

  // initial demo data (so UI looks full)
  function seedDemo(){
    const demo = [
      createMensaje("WhatsApp","Luis","Hola, tengo un problema con mi pedido, no llega desde ayer"),
      createMensaje("Gmail","cliente@empresa.com","Solicito cotización del servicio mensual"),
      createMensaje("Telegram","Ana","Gracias por su apoyo, todo bien con la entrega"),
      createMensaje("Facebook","Julio","Error en la plataforma, aparece 500"),
      createMensaje("Formulario","María","Quisiera saber el costo y horarios"),
    ];
    // push older messages last
    state.mensajes = demo.concat(state.mensajes);
    renderList();
  }

  seedDemo();

  // keyboard: Esc to close modal
  document.addEventListener("keyup", (e) => {
    if (e.key === "Escape") composeModal.classList.add("hidden");
  });
});
