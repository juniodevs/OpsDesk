// OpsDesk - Lógica de Frontend Operacional
const API_BASE = "";

let currentUser = null;
let currentToken = null;
let currentTicketId = null;
let searchDebounceTimeout = null;

// Elementos da UI
const userDisplayName = document.getElementById("user-display-name");
const userDisplayRole = document.getElementById("user-display-role");
const btnLogout = document.getElementById("btn-logout");
const globalAlertContainer = document.getElementById("global-alert-container");

const viewTicketsList = document.getElementById("view-tickets-list");
const viewTicketDetail = document.getElementById("view-ticket-detail");

const ticketsTable = document.getElementById("tickets-table");
const ticketsTbody = document.getElementById("tickets-tbody");
const tableEmptyState = document.getElementById("table-empty-state");
const tableLoadingState = document.getElementById("table-loading-state");

const searchInput = document.getElementById("search-input");
const filterStatus = document.getElementById("filter-status");
const filterSeverity = document.getElementById("filter-severity");
const btnClearFilters = document.getElementById("btn-clear-filters");

const modalCreate = document.getElementById("modal-create-ticket");
const btnOpenCreateModal = document.getElementById("btn-open-create-modal");
const btnCloseCreateModal = document.getElementById("btn-close-create-modal");
const btnCancelCreate = document.getElementById("btn-cancel-create");
const formCreateTicket = document.getElementById("form-create-ticket");

const modalResolution = document.getElementById("modal-resolution");
const btnCloseResolutionModal = document.getElementById("btn-close-resolution-modal");
const btnCancelResolution = document.getElementById("btn-cancel-resolution");
const formResolution = document.getElementById("form-resolution");

// Elementos de Login e Dashboard
const viewLogin = document.getElementById("view-login");
const viewDashboard = document.getElementById("view-dashboard");
const formLogin = document.getElementById("form-login");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginErrorAlert = document.getElementById("login-error-alert");

const btnFillAdmin = document.getElementById("btn-fill-admin");
const btnFillAnalyst = document.getElementById("btn-fill-analyst");
const btnFillReporter = document.getElementById("btn-fill-reporter");

// Inicialização da Aplicação
async function init() {
  setupEventListeners();

  // Verifica se já existe sessão salva
  const savedToken = localStorage.getItem("opsdesk_token");
  const savedUser = localStorage.getItem("opsdesk_user");

  if (savedToken && savedUser) {
    try {
      currentToken = savedToken;
      currentUser = JSON.parse(savedUser);
      showDashboardView();
      renderUserInfo();
      loadTickets();
    } catch {
      showLoginView();
    }
  } else {
    showLoginView();
  }
}

function showLoginView() {
  if (viewLogin) viewLogin.style.display = "flex";
  if (viewDashboard) viewDashboard.style.display = "none";
  if (loginErrorAlert) loginErrorAlert.innerHTML = "";
  if (loginEmailInput) {
    loginEmailInput.value = "";
    loginPasswordInput.value = "";
    loginEmailInput.focus();
  }
}

function showDashboardView() {
  if (viewLogin) viewLogin.style.display = "none";
  if (viewDashboard) viewDashboard.style.display = "block";
}

// Autenticação e Perfis
async function loginUser(email, password) {
  if (loginErrorAlert) loginErrorAlert.innerHTML = "";
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error || "Credenciais inválidas. Verifique seu e-mail e senha.";
      if (loginErrorAlert) {
        loginErrorAlert.innerHTML = `<div class="alert-box alert-danger" data-testid="login-alert-danger">${escapeHtml(errorMsg)}</div>`;
      }
      showAlert(errorMsg, "danger");
      return false;
    }

    currentToken = data.token;
    currentUser = data.user;

    localStorage.setItem("opsdesk_token", currentToken);
    localStorage.setItem("opsdesk_user", JSON.stringify(currentUser));

    showDashboardView();
    renderUserInfo();
    showAlert(`Autenticado com sucesso como ${currentUser.name} (${currentUser.role}).`, "success");

    if (currentTicketId) {
      loadTicketDetail(currentTicketId);
    } else {
      loadTickets();
    }
    return true;
  } catch (err) {
    const errorMsg = "Servidor indisponível no momento.";
    if (loginErrorAlert) {
      loginErrorAlert.innerHTML = `<div class="alert-box alert-danger">${errorMsg}</div>`;
    }
    showAlert(errorMsg, "danger");
    return false;
  }
}

function renderUserInfo() {
  if (!currentUser) return;
  userDisplayName.textContent = currentUser.name;
  userDisplayRole.textContent = currentUser.role;
  userDisplayRole.className = `role-tag ${currentUser.role.toLowerCase()}`;

  // Ajusta permissões visuais
  const btnDelete = document.getElementById("btn-delete-ticket");
  if (btnDelete) {
    btnDelete.style.display = currentUser.role === "ADMIN" ? "inline-flex" : "none";
  }

  const internalCheckboxLabel = document.getElementById("label-internal-note");
  if (internalCheckboxLabel) {
    internalCheckboxLabel.style.display = currentUser.role === "REPORTER" ? "none" : "flex";
  }
}

function getAuthHeaders() {
  return {
    "Authorization": `Bearer ${currentToken}`,
    "Content-Type": "application/json",
  };
}

// Carregamento de Lista de Incidentes com Filtros
async function loadTickets() {
  tableLoadingState.style.display = "flex";
  tableEmptyState.style.display = "none";
  ticketsTbody.innerHTML = "";

  const params = new URLSearchParams();
  if (filterStatus.value !== "ALL") params.append("status", filterStatus.value);
  if (filterSeverity.value !== "ALL") params.append("severity", filterSeverity.value);
  if (searchInput.value.trim() !== "") params.append("search", searchInput.value.trim());

  try {
    const res = await fetch(`${API_BASE}/api/tickets?${params.toString()}`, {
      headers: getAuthHeaders(),
    });

    tableLoadingState.style.display = "none";

    if (!res.ok) {
      showAlert("Falha ao carregar lista de incidentes.", "danger");
      return;
    }

    const data = await res.json();
    const tickets = data.tickets || [];

    if (tickets.length === 0) {
      tableEmptyState.style.display = "flex";
      return;
    }

    tickets.forEach((t) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-testid", "ticket-row");
      tr.setAttribute("data-ticket-id", t.id);
      tr.tabIndex = 0; // Acessibilidade por teclado

      const formattedDate = new Date(t.createdAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      tr.innerHTML = `
        <td data-label="ID"><span class="ticket-number">${t.ticketNumber}</span></td>
        <td data-label="Título">
          <div class="ticket-title">${escapeHtml(t.title)}</div>
          <div class="ticket-service">${escapeHtml(t.service)} &bull; ${t.notesCount || 0} notas &bull; ${t.attachmentsCount || 0} anexos</div>
        </td>
        <td data-label="Severidade">
          <span class="severity-badge ${t.severity.toLowerCase()}">${t.severity}</span>
        </td>
        <td data-label="Status">
          <span class="status-badge ${t.status.toLowerCase()}">${t.status}</span>
        </td>
        <td data-label="Responsável">${t.assigneeName ? escapeHtml(t.assigneeName) : '<span style="color: var(--text-muted);">&mdash;</span>'}</td>
        <td data-label="Aberto em" style="color: var(--text-muted); font-size: 0.8125rem;">${formattedDate}</td>
      `;

      tr.addEventListener("click", () => openTicketDetail(t.id));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTicketDetail(t.id);
        }
      });

      ticketsTbody.appendChild(tr);
    });
  } catch (err) {
    tableLoadingState.style.display = "none";
    showAlert("Erro de conexão ao buscar chamados.", "danger");
  }
}

// Abertura e Visualização de Detalhes
async function openTicketDetail(id) {
  currentTicketId = id;
  viewTicketsList.style.display = "none";
  viewTicketDetail.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
  await loadTicketDetail(id);
}

function backToList() {
  currentTicketId = null;
  viewTicketDetail.style.display = "none";
  viewTicketsList.style.display = "block";
  loadTickets();
}

async function loadTicketDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      showAlert("Incidente não encontrado.", "danger");
      backToList();
      return;
    }

    const { ticket, notes, attachments, auditLogs } = await res.json();

    // Preenche dados principais
    document.getElementById("detail-ticket-number").textContent = ticket.ticketNumber;
    
    const severityBadge = document.getElementById("detail-ticket-severity");
    severityBadge.textContent = ticket.severity;
    severityBadge.className = `severity-badge ${ticket.severity.toLowerCase()}`;

    const statusBadge = document.getElementById("detail-ticket-status");
    statusBadge.textContent = ticket.status;
    statusBadge.className = `status-badge ${ticket.status.toLowerCase()}`;

    document.getElementById("detail-ticket-title").textContent = ticket.title;
    document.getElementById("detail-ticket-desc").textContent = ticket.description;
    document.getElementById("detail-ticket-service").textContent = ticket.service;
    document.getElementById("detail-ticket-creator").textContent = ticket.creatorName;
    document.getElementById("detail-ticket-assignee").textContent = ticket.assigneeName || "Não atribuído";

    // Configura botões de transição conforme permissão
    configureStatusButtons(ticket.status);

    // Renderiza notas
    renderNotes(notes);

    // Renderiza anexos
    renderAttachments(attachments);

    // Renderiza auditoria
    renderAuditLogs(auditLogs);
  } catch (err) {
    showAlert("Falha ao carregar detalhes do incidente.", "danger");
  }
}

function configureStatusButtons(currentStatus) {
  const transitionsCard = document.getElementById("status-transitions-card");
  if (currentUser.role === "REPORTER") {
    transitionsCard.style.display = "none";
    return;
  }
  transitionsCard.style.display = "block";

  const btnInvestigating = document.getElementById("btn-status-investigating");
  const btnMitigated = document.getElementById("btn-status-mitigated");
  const btnResolved = document.getElementById("btn-status-resolved");
  const btnClosed = document.getElementById("btn-status-closed");

  // Regra de transição: OPEN não pode fechar direto
  btnClosed.disabled = currentStatus === "OPEN";
  btnInvestigating.disabled = currentStatus === "INVESTIGATING";
  btnMitigated.disabled = currentStatus === "MITIGATED";
  btnResolved.disabled = currentStatus === "RESOLVED";
}

function renderNotes(notes) {
  const notesList = document.getElementById("notes-list");
  notesList.innerHTML = "";

  if (notes.length === 0) {
    notesList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8125rem;">Nenhuma nota registrada até o momento.</p>`;
    return;
  }

  notes.forEach((n) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    const dateStr = new Date(n.createdAt).toLocaleString("pt-BR");

    item.innerHTML = `
      <div class="timeline-meta">
        <span><strong>${escapeHtml(n.authorName)}</strong> (${n.authorRole})</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${n.isInternal ? '<span class="note-internal-badge">INTERNA</span>' : ''}
          <span>${dateStr}</span>
        </div>
      </div>
      <div style="color: var(--text-main); font-size: 0.875rem; white-space: pre-wrap;">${escapeHtml(n.content)}</div>
    `;
    notesList.appendChild(item);
  });
}

function renderAttachments(attachments) {
  const attachmentsList = document.getElementById("attachments-list");
  attachmentsList.innerHTML = "";

  if (attachments.length === 0) {
    attachmentsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.75rem;">Nenhum anexo adicionado.</p>`;
    return;
  }

  attachments.forEach((att) => {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.style.padding = "8px";
    item.style.backgroundColor = "var(--bg-base)";
    item.style.borderRadius = "4px";
    item.style.border = "1px solid var(--border-subtle)";
    item.style.fontSize = "0.75rem";

    const sizeKb = (att.sizeBytes / 1024).toFixed(1);

    item.innerHTML = `
      <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
        <a href="${API_BASE}/api/attachments/${att.id}/download" target="_blank" style="color: #60a5fa; text-decoration: none; font-weight: 600;">
          ${escapeHtml(att.filename)}
        </a>
        <div style="color: var(--text-muted); font-size: 0.6875rem;">${sizeKb} KB</div>
      </div>
      ${
        currentUser.role !== "REPORTER"
          ? `<button type="button" class="btn btn-secondary btn-sm" style="color: #f87171; padding: 2px 6px; min-height: 24px;" onclick="deleteAttachment('${att.id}')">&times;</button>`
          : ""
      }
    `;
    attachmentsList.appendChild(item);
  });
}

window.deleteAttachment = async function (id) {
  if (!confirm("Deseja realmente remover este anexo?")) return;
  try {
    const res = await fetch(`${API_BASE}/api/attachments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      showAlert("Não foi possível excluir o anexo.", "danger");
      return;
    }
    showAlert("Anexo excluído.", "success");
    loadTicketDetail(currentTicketId);
  } catch {
    showAlert("Falha na requisição de exclusão.", "danger");
  }
};

function renderAuditLogs(logs) {
  const auditList = document.getElementById("audit-list");
  auditList.innerHTML = "";

  if (logs.length === 0) {
    auditList.innerHTML = `<p style="color: var(--text-muted);">Sem registros de auditoria.</p>`;
    return;
  }

  logs.forEach((log) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    const dateStr = new Date(log.createdAt).toLocaleString("pt-BR");

    item.innerHTML = `
      <div style="color: #93c5fd; font-weight: 600; margin-bottom: 2px;">${escapeHtml(log.action)}</div>
      <div style="color: var(--text-main); margin-bottom: 4px;">${escapeHtml(log.details)}</div>
      <div style="color: var(--text-muted); font-size: 0.6875rem;">Por ${escapeHtml(log.actorName)} &bull; ${dateStr}</div>
    `;
    auditList.appendChild(item);
  });
}

// Alteração de Status
async function changeStatus(targetStatus, resolutionNote = "") {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/${currentTicketId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: targetStatus, resolutionNote }),
    });

    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Não foi possível alterar o status.", "danger");
      return;
    }

    showAlert(`Status atualizado para ${targetStatus}.`, "success");
    loadTicketDetail(currentTicketId);
  } catch (err) {
    showAlert("Erro de conexão ao atualizar status.", "danger");
  }
}

// Configuração de Listeners de Eventos
function setupEventListeners() {
  // Submissão do formulário de login real
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value;
      await loginUser(email, password);
    });
  }

  // Botões de preenchimento rápido na tela de login
  if (btnFillAdmin) {
    btnFillAdmin.addEventListener("click", () => {
      loginEmailInput.value = "admin@opsdesk.local";
      loginPasswordInput.value = "Admin123!";
      loginPasswordInput.focus();
    });
  }

  if (btnFillAnalyst) {
    btnFillAnalyst.addEventListener("click", () => {
      loginEmailInput.value = "analyst@opsdesk.local";
      loginPasswordInput.value = "Analyst123!";
      loginPasswordInput.focus();
    });
  }

  if (btnFillReporter) {
    btnFillReporter.addEventListener("click", () => {
      loginEmailInput.value = "reporter@opsdesk.local";
      loginPasswordInput.value = "Reporter123!";
      loginPasswordInput.focus();
    });
  }

  // Troca rápida de perfis na barra de demonstração do painel
  document.getElementById("btn-demo-admin").addEventListener("click", () => {
    loginUser("admin@opsdesk.local", "Admin123!");
  });
  document.getElementById("btn-demo-analyst").addEventListener("click", () => {
    loginUser("analyst@opsdesk.local", "Analyst123!");
  });
  document.getElementById("btn-demo-reporter").addEventListener("click", () => {
    loginUser("reporter@opsdesk.local", "Reporter123!");
  });

  // Logout real: limpa sessão e exibe a tela de login
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("opsdesk_token");
      localStorage.removeItem("opsdesk_user");
      currentToken = null;
      currentUser = null;
      currentTicketId = null;
      showLoginView();
      if (loginErrorAlert) {
        loginErrorAlert.innerHTML = `
          <div class="alert-box alert-success" style="font-size: 0.8125rem;">
            Sessão encerrada com sucesso.
          </div>
        `;
      }
    });
  }

  // Filtros
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(loadTickets, 300);
  });
  filterStatus.addEventListener("change", loadTickets);
  filterSeverity.addEventListener("change", loadTickets);

  btnClearFilters.addEventListener("click", () => {
    searchInput.value = "";
    filterStatus.value = "ALL";
    filterSeverity.value = "ALL";
    loadTickets();
  });

  // Navegação de detalhes
  document.getElementById("btn-back-to-list").addEventListener("click", backToList);

  // Exclusão de chamado
  document.getElementById("btn-delete-ticket").addEventListener("click", async () => {
    if (!confirm("Deseja realmente excluir este chamado permanentemente?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${currentTicketId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showAlert("Incidente excluído com sucesso.", "success");
        backToList();
      } else {
        showAlert("Não foi possível excluir o incidente.", "danger");
      }
    } catch {
      showAlert("Falha na requisição de exclusão.", "danger");
    }
  });

  // Botões de transição de status
  document.getElementById("btn-status-investigating").addEventListener("click", () => {
    changeStatus("INVESTIGATING");
  });
  document.getElementById("btn-status-mitigated").addEventListener("click", () => {
    changeStatus("MITIGATED");
  });
  document.getElementById("btn-status-resolved").addEventListener("click", () => {
    openModal(modalResolution);
  });
  document.getElementById("btn-status-closed").addEventListener("click", () => {
    changeStatus("CLOSED");
  });

  // Modal de Resolução
  btnCloseResolutionModal.addEventListener("click", () => closeModal(modalResolution));
  btnCancelResolution.addEventListener("click", () => closeModal(modalResolution));
  formResolution.addEventListener("submit", (e) => {
    e.preventDefault();
    const note = document.getElementById("textarea-resolution-note").value.trim();
    if (note.length < 5) {
      document.getElementById("error-resolution").textContent = "Nota deve ter no mínimo 5 caracteres.";
      return;
    }
    closeModal(modalResolution);
    changeStatus("RESOLVED", note);
  });

  // Adição de nota técnica
  document.getElementById("form-add-note").addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = document.getElementById("textarea-note-content");
    const isInternal = document.getElementById("checkbox-internal-note").checked;
    const content = textarea.value.trim();

    if (!content) return;

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${currentTicketId}/notes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, isInternal }),
      });

      if (!res.ok) {
        showAlert("Erro ao registrar nota.", "danger");
        return;
      }

      textarea.value = "";
      showAlert("Nota registrada.", "success");
      loadTicketDetail(currentTicketId);
    } catch {
      showAlert("Falha de conexão ao enviar nota.", "danger");
    }
  });

  // Upload de anexo
  document.getElementById("form-upload-attachment").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("file-upload-input");
    const feedback = document.getElementById("upload-feedback");
    feedback.textContent = "";

    if (!fileInput.files || fileInput.files.length === 0) {
      feedback.innerHTML = `<span style="color: #f87171;">Selecione um arquivo primeiro.</span>`;
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    feedback.innerHTML = `<span style="color: var(--text-muted);">Enviando...</span>`;

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${currentTicketId}/attachments`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        feedback.innerHTML = `<span style="color: #f87171;">${data.error || "Erro no envio"}</span>`;
        return;
      }

      feedback.innerHTML = `<span style="color: #34d399;">Anexo enviado com sucesso!</span>`;
      fileInput.value = "";
      loadTicketDetail(currentTicketId);
    } catch {
      feedback.innerHTML = `<span style="color: #f87171;">Falha ao conectar com o servidor.</span>`;
    }
  });

  // Modal Novo Incidente
  btnOpenCreateModal.addEventListener("click", () => {
    formCreateTicket.reset();
    document.getElementById("create-ticket-error").innerHTML = "";
    document.getElementById("error-title").textContent = "";
    document.getElementById("error-service").textContent = "";
    document.getElementById("error-desc").textContent = "";
    openModal(modalCreate);
  });

  btnCloseCreateModal.addEventListener("click", () => closeModal(modalCreate));
  btnCancelCreate.addEventListener("click", () => closeModal(modalCreate));

  formCreateTicket.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("input-ticket-title").value.trim();
    const service = document.getElementById("input-ticket-service").value.trim();
    const severity = document.getElementById("select-ticket-severity").value;
    const description = document.getElementById("textarea-ticket-desc").value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, service, severity, description }),
      });

      const data = await res.json();
      if (!res.ok) {
        document.getElementById("create-ticket-error").innerHTML = `
          <div class="alert-box alert-danger">${data.error || "Erro de validação."}</div>
        `;
        return;
      }

      closeModal(modalCreate);
      showAlert(`Incidente ${data.ticket.ticketNumber} aberto com sucesso!`, "success");
      loadTickets();
    } catch {
      document.getElementById("create-ticket-error").innerHTML = `
        <div class="alert-box alert-danger">Falha ao salvar incidente no servidor.</div>
      `;
    }
  });

  // Fechamento de modal com teclado (tecla Escape - Acessibilidade WCAG AA)
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modalCreate.classList.contains("active")) closeModal(modalCreate);
      if (modalResolution.classList.contains("active")) closeModal(modalResolution);
    }
  });
}

function openModal(modal) {
  modal.classList.add("active");
  const firstInput = modal.querySelector("input, textarea, select");
  if (firstInput) firstInput.focus();
}

function closeModal(modal) {
  modal.classList.remove("active");
}

function showAlert(message, type = "success") {
  globalAlertContainer.innerHTML = `
    <div class="alert-box alert-${type}" role="alert">
      <span>${escapeHtml(message)}</span>
      <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 6px; min-height: 24px;" onclick="this.parentElement.remove()">&times;</button>
    </div>
  `;
  setTimeout(() => {
    if (globalAlertContainer.firstChild) {
      globalAlertContainer.innerHTML = "";
    }
  }, 5000);
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Inicia aplicação após carregamento da página
window.addEventListener("DOMContentLoaded", init);
