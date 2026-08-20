// API Client para a plataforma Stylety
const API = {
  getToken() {
    return localStorage.getItem('stylety_token') || localStorage.getItem('pinterest_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('stylety_token', token);
    } else {
      localStorage.removeItem('stylety_token');
      localStorage.removeItem('pinterest_token');
    }
  },

  getHeaders(isFormData = false) {
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...this.getHeaders(isFormData),
      ...(options.headers || {})
    };

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição ao servidor.');
    }
    return data;
  },

  // Auth & Perfil (RF001, RNE001, RNF003)
  register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  login(credentials) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  socialLogin(socialData) {
    return this.request('/api/auth/social-login', {
      method: 'POST',
      body: JSON.stringify(socialData)
    });
  },

  getMe() {
    return this.request('/api/auth/me');
  },

  updateProfile(formData) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: formData
    });
  },

  toggle2FA(enable) {
    return this.request('/api/auth/2fa/toggle', {
      method: 'POST',
      body: JSON.stringify({ enable })
    });
  },

  // Pins (RF002, RNE002)
  getPins(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/pins?${query}`);
  },

  getPinById(id) {
    return this.request(`/api/pins/${id}`);
  },

  createPin(formData) {
    return this.request('/api/pins', {
      method: 'POST',
      body: formData
    });
  },

  updatePin(id, data) {
    return this.request(`/api/pins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deletePin(id) {
    return this.request(`/api/pins/${id}`, {
      method: 'DELETE'
    });
  },

  // Pastas / Boards (RF003, RNE002)
  getBoards(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/boards?${query}`);
  },

  getBoardById(id) {
    return this.request(`/api/boards/${id}`);
  },

  createBoard(data) {
    return this.request('/api/boards', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateBoard(id, data) {
    return this.request(`/api/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteBoard(id) {
    return this.request(`/api/boards/${id}`, {
      method: 'DELETE'
    });
  },

  savePinToBoard(boardId, pinId, secao = '') {
    return this.request(`/api/boards/${boardId}/pins`, {
      method: 'POST',
      body: JSON.stringify({ pinId, secao })
    });
  },

  removePinFromBoard(boardId, pinId) {
    return this.request(`/api/boards/${boardId}/pins/${pinId}`, {
      method: 'DELETE'
    });
  },

  inviteCollaborator(boardId, emailOuNome, permissao = 'editor') {
    return this.request(`/api/boards/${boardId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ emailOuNome, permissao })
    });
  },

  // Feed & Recomendações (RF005)
  getFeed(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/feed?${query}`);
  },

  // Pesquisa & Pinterest Lens (RF004)
  search(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/search?${query}`);
  },

  getSuggestions(q) {
    return this.request(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
  },

  searchLens(formData) {
    return this.request('/api/search/lens', {
      method: 'POST',
      body: formData
    });
  },

  // Interações & Social (RF006, RF007)
  toggleLike(pinId) {
    return this.request(`/api/interactions/pins/${pinId}/like`, {
      method: 'POST'
    });
  },

  addComment(pinId, formData) {
    return this.request(`/api/interactions/pins/${pinId}/comments`, {
      method: 'POST',
      body: formData
    });
  },

  deleteComment(commentId) {
    return this.request(`/api/interactions/comments/${commentId}`, {
      method: 'DELETE'
    });
  },

  toggleFollow(userId) {
    return this.request(`/api/interactions/users/${userId}/follow`, {
      method: 'POST'
    });
  },

  getUserProfile(userId) {
    return this.request(`/api/interactions/users/${userId}`);
  },

  // Notificações (RF007)
  getNotifications() {
    return this.request('/api/notifications');
  },

  markNotificationRead(id) {
    return this.request(`/api/notifications/${id}/read`, {
      method: 'PUT'
    });
  },

  markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', {
      method: 'PUT'
    });
  },

  // Mensagens Diretas Internas (RF006)
  getConversations() {
    return this.request('/api/messages/conversations');
  },

  getMessagesWithUser(userId) {
    return this.request(`/api/messages/user/${userId}`);
  },

  sendMessage(data) {
    return this.request('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Denúncia & Moderação (RF008, RNE003)
  reportContent(reportData) {
    return this.request('/api/moderation/report', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  getModerationReports(status = 'todos') {
    return this.request(`/api/moderation/reports?status=${status}`);
  },

  executeModerationAction(reportId, actionData) {
    return this.request(`/api/moderation/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify(actionData)
    });
  },

  // LGPD & Backup (RNF003, RNE004, RNF006)
  exportUserData() {
    window.location.href = `/api/lgpd/export?token=${this.getToken()}`;
  },

  requestAccountDeletion() {
    return this.request('/api/lgpd/request-deletion', {
      method: 'POST'
    });
  },

  createBackup() {
    return this.request('/api/backup/create', {
      method: 'POST'
    });
  },

  listBackups() {
    return this.request('/api/backup/list');
  }
};
