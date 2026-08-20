// Aplicação Principal Stylety (IFPA Teste de Software)
const App = {
  state: {
    currentUser: null,
    currentTab: 'home',
    selectedTopic: 'Tudo',
    searchType: 'todos',
    pins: [],
    notifications: [],
    unreadNotifs: 0,
    activeChatUser: null,
    activePinForLens: null
  },

  async init() {
    this.setupAccessibility();
    this.setupEventListeners();
    await this.checkAuth();
    this.loadFeed();
    this.startNotificationPolling();
    this.registerPWA();
    this.refreshIcons();
  },

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  // RNF004 - Acessibilidade WCAG 2.1 AA
  setupAccessibility() {
    const savedContrast = localStorage.getItem('stylety_contrast');
    if (savedContrast === 'high') {
      document.body.classList.add('high-contrast');
    }

    const savedFontScale = localStorage.getItem('stylety_font_scale') || '1';
    document.documentElement.style.setProperty('--font-scale', savedFontScale);

    // Navegação por teclado (ESC para fechar modais, Ctrl+K para buscar)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    });
  },

  toggleHighContrast() {
    const isHigh = document.body.classList.toggle('high-contrast');
    localStorage.setItem('stylety_contrast', isHigh ? 'high' : 'normal');
    this.showToast(isHigh ? 'Modo Alto Contraste Ativado' : 'Modo Padrão Ativado');
  },

  adjustFontSize(delta) {
    let current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale') || '1');
    current = Math.min(Math.max(current + delta, 0.8), 1.5);
    document.documentElement.style.setProperty('--font-scale', current);
    localStorage.setItem('stylety_font_scale', current);
  },

  // RNF005 - PWA Service Worker
  registerPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }
  },

  // Autenticação & Usuário Atual
  async checkAuth() {
    const token = API.getToken();
    if (token) {
      try {
        const data = await API.getMe();
        this.state.currentUser = data.user;
        this.updateUserUI();
        this.loadNotifications();
      } catch (e) {
        API.setToken(null);
        this.state.currentUser = null;
        this.updateUserUI();
      }
    } else {
      this.updateUserUI();
    }
  },

  updateUserUI() {
    const authBtn = document.getElementById('btnAuthHeader');
    const userMenu = document.getElementById('userProfileMenuBtn');
    const modTab = document.getElementById('navModBtn');
    const guestNotice = document.getElementById('guestNoticeBanner');
    const minorNotice = document.getElementById('minorNoticeBanner');

    if (this.state.currentUser) {
      if (authBtn) authBtn.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'flex';
        document.getElementById('headerUserAvatar').src = this.state.currentUser.foto_perfil_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(this.state.currentUser.nome);
        const nameEl = document.getElementById('dropdownUserName');
        const emailEl = document.getElementById('dropdownUserEmail');
        if (nameEl) nameEl.textContent = this.state.currentUser.nome;
        if (emailEl) emailEl.textContent = this.state.currentUser.email;
      }
      if (modTab) {
        modTab.style.display = this.state.currentUser.role === 'moderador' ? 'inline-flex' : 'none';
      }
      if (guestNotice) guestNotice.style.display = 'none';
      if (minorNotice) {
        const age = this.calculateAge(this.state.currentUser.data_nascimento);
        minorNotice.style.display = age < 18 ? 'flex' : 'none';
      }
    } else {
      if (authBtn) authBtn.style.display = 'inline-flex';
      if (userMenu) userMenu.style.display = 'none';
      if (modTab) modTab.style.display = 'none';
      if (guestNotice) guestNotice.style.display = 'flex';
      if (minorNotice) minorNotice.style.display = 'none';
    }
    this.refreshIcons();
  },

  calculateAge(birthDateString) {
    if (!birthDateString) return 25;
    const birth = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  },

  // RF005 – Carregar Feed de Recomendações
  async loadFeed(topic = null) {
    if (topic) this.state.selectedTopic = topic;
    this.updateTopicPills();
    this.setActiveNav('navHomeBtn');

    const container = document.getElementById('masonryFeed');
    if (!container) return;
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);"><div class="spinner"></div> Carregando ideias...</div>';

    try {
      const data = await API.getFeed({ topico: this.state.selectedTopic });
      this.state.pins = data.feed || [];
      this.renderPins(this.state.pins, container);
    } catch (e) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #dc3545;">Erro ao carregar o feed: ${e.message}</div>`;
    }
  },

  openExplore() {
    this.setActiveNav('navExploreBtn');
    this.loadFeed('Tudo');
    this.showToast('Explorando ideias em alta no Stylety');
  },

  setActiveNav(btnId) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId)?.classList.add('active');
  },

  updateTopicPills() {
    const pills = document.querySelectorAll('.topic-pill');
    pills.forEach(p => {
      if (p.dataset.topic === this.state.selectedTopic) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  },

  // Renderização da Grade Masonry Estilo Pinterest (RNF001, RNF004)
  renderPins(pins, container) {
    if (!pins || pins.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted); font-size: 1.1rem;">Nenhuma ideia encontrada. Seja o primeiro a criar um Pin no Stylety!</div>';
      return;
    }

    container.innerHTML = pins.map(pin => {
      const isLiked = pin.curtido_pelo_usuario;
      const isSaved = pin.salvo_pelo_usuario;
      const altText = pin.texto_alternativo || pin.titulo;

      return `
        <div class="pin-card" data-pin-id="${pin.id}" tabindex="0" role="article" aria-label="Pin: ${pin.titulo}">
          <div class="pin-media-wrapper" style="background-color: ${pin.cor_dominante || '#efefef'};">
            ${pin.tipo_midia === 'video' ? `
              <video src="${pin.midia_url}" class="pin-media" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
            ` : `
              <img src="${pin.midia_url}" alt="${altText}" class="pin-media" loading="lazy" />
            `}
            <div class="pin-overlay">
              <div class="pin-overlay-top">
                <span></span>
                <button class="btn-save-pin ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); App.openSaveModal('${pin.id}')" aria-label="Salvar na pasta">
                  <i data-lucide="${isSaved ? 'check' : 'bookmark'}" class="icon-sm"></i>
                  <span>${isSaved ? 'Salvo' : 'Salvar'}</span>
                </button>
              </div>
              <div class="pin-overlay-bottom">
                ${pin.link_destino ? `
                  <a href="${pin.link_destino}" target="_blank" rel="noopener noreferrer" class="btn-link-action" onclick="event.stopPropagation()" title="Abrir link externo">
                    <i data-lucide="external-link" class="icon-xs"></i>
                    <span>${pin.link_destino.replace(/^https?:\/\//, '').split('/')[0]}</span>
                  </a>
                ` : '<span></span>'}
                <div style="display: flex; gap: 6px;">
                  <button class="btn-round-action" onclick="event.stopPropagation(); App.openLensModalWithPin('${pin.id}')" title="Buscar ideias similares (Lens)" aria-label="Buscar similares">
                    <i data-lucide="camera" class="icon-sm"></i>
                  </button>
                  <button class="btn-round-action" onclick="event.stopPropagation(); App.toggleLike('${pin.id}')" title="Curtir" aria-label="Curtir">
                    <i data-lucide="heart" class="icon-sm ${isLiked ? 'heart-liked' : ''}"></i>
                  </button>
                  <button class="btn-round-action" onclick="event.stopPropagation(); App.openShareModal('${pin.id}')" title="Compartilhar" aria-label="Compartilhar">
                    <i data-lucide="share-2" class="icon-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="pin-info" onclick="App.openPinDetails('${pin.id}')">
            <h3 class="pin-title">${pin.titulo}</h3>
            <div class="pin-author">
              <img src="${pin.autor_foto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(pin.autor_nome)}" alt="Foto de ${pin.autor_nome}" />
              <span>${pin.autor_nome}</span>
            </div>
            <div class="pin-meta-counts">
              <span><i data-lucide="heart" class="icon-xs"></i> ${pin.curtidas_count || 0}</span>
              <span><i data-lucide="message-circle" class="icon-xs"></i> ${pin.comentarios_count || 0}</span>
              ${pin.saves_count ? `<span><i data-lucide="bookmark" class="icon-xs"></i> ${pin.saves_count}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Listener de clique no card
    container.querySelectorAll('.pin-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('a')) {
          const pinId = card.dataset.pinId;
          App.openPinDetails(pinId);
        }
      });
    });

    this.refreshIcons();
  },

  // RF002 – Detalhes do Pin Modal + Seção "Mais como este"
  async openPinDetails(pinId) {
    try {
      const data = await API.getPinById(pinId);
      const pin = data.pin;
      const comentarios = data.comentarios || [];

      const modal = document.getElementById('pinDetailModal');
      const body = document.getElementById('pinDetailModalContent');

      const isAuthor = this.state.currentUser && this.state.currentUser.id === pin.usuario_id;
      const isMod = this.state.currentUser && this.state.currentUser.role === 'moderador';
      const canDelete = isAuthor || isMod;

      body.innerHTML = `
        <div class="pin-detail-layout">
          <div class="pin-detail-media-container">
            ${pin.tipo_midia === 'video' ? `
              <video src="${pin.midia_url}" controls autoplay class="pin-detail-media"></video>
            ` : `
              <img src="${pin.midia_url}" alt="${pin.texto_alternativo || pin.titulo}" class="pin-detail-media" />
            `}
          </div>
          <div class="pin-detail-body">
            <div class="pin-detail-header-actions">
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn btn-secondary" onclick="App.openShareModal('${pin.id}')">
                  <i data-lucide="share-2" class="icon-sm"></i> Compartilhar
                </button>
                <button class="btn btn-secondary" onclick="App.openLensModalWithPin('${pin.id}')">
                  <i data-lucide="camera" class="icon-sm"></i> Lens
                </button>
                <button class="btn btn-secondary" onclick="App.openReportModal('pin', '${pin.id}')" title="Denunciar">
                  <i data-lucide="flag" class="icon-sm"></i>
                </button>
                ${canDelete ? `
                  <button class="btn btn-danger" onclick="App.confirmDeletePin('${pin.id}')" title="Excluir Definitivamente (RNE002)">
                    <i data-lucide="trash-2" class="icon-sm"></i> Excluir
                  </button>
                ` : ''}
              </div>
              <button class="btn btn-primary ${pin.salvo_pelo_usuario ? 'saved' : ''}" onclick="App.openSaveModal('${pin.id}')">
                <i data-lucide="${pin.salvo_pelo_usuario ? 'check' : 'bookmark'}" class="icon-sm"></i>
                <span>${pin.salvo_pelo_usuario ? 'Salvo' : 'Salvar'}</span>
              </button>
            </div>

            ${pin.link_destino ? `
              <a href="${pin.link_destino}" target="_blank" rel="noopener noreferrer" style="color: var(--text-main); font-weight: 700; text-decoration: underline; word-break: break-all; display: inline-flex; align-items: center; gap: 6px; font-size: 0.95rem;">
                <i data-lucide="external-link" class="icon-sm"></i> ${pin.link_destino}
              </a>
            ` : ''}

            <h1 class="pin-detail-title">${pin.titulo}</h1>
            <p class="pin-detail-desc">${pin.descricao || 'Sem descrição.'}</p>
            
            ${pin.texto_alternativo ? `
              <div style="font-size: 0.82rem; color: var(--text-muted); background: #f7f7f7; padding: 8px 12px; border-radius: 8px;">
                <strong>Texto Alternativo (WCAG AA):</strong> ${pin.texto_alternativo}
              </div>
            ` : ''}

            <div class="pin-disclaimer">
              <i data-lucide="shield-alert" class="icon-sm"></i>
              <span>${pin.link_responsabilidade_aviso}</span>
            </div>

            <!-- Autor do Pin -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="App.openUserProfile('${pin.usuario_id}')">
                <img src="${pin.autor_foto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(pin.autor_nome)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" />
                <div>
                  <div style="font-weight: 700; font-size: 1rem;">${pin.autor_nome}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">${pin.autor_tipo_conta === 'business' ? 'Conta Comercial' : 'Criador'}</div>
                </div>
              </div>
              ${this.state.currentUser && this.state.currentUser.id !== pin.usuario_id ? `
                <button class="btn btn-secondary" onclick="App.toggleFollow('${pin.usuario_id}')">
                  <i data-lucide="user-plus" class="icon-sm"></i> Seguir
                </button>
              ` : ''}
            </div>

            <!-- Curtidas -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <button class="btn btn-secondary" onclick="App.toggleLike('${pin.id}', true)">
                <i data-lucide="heart" class="icon-sm ${pin.curtido_pelo_usuario ? 'heart-liked' : ''}"></i>
                <span>${pin.curtido_pelo_usuario ? 'Curtido' : 'Curtir'} (${pin.curtidas_count})</span>
              </button>
            </div>

            <!-- Comentários (RF006) com Respostas Aninhadas -->
            <div class="pin-comments-section">
              <h4 style="font-size: 1.05rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="message-circle" class="icon-sm"></i> Comentários (${comentarios.reduce((acc, c) => acc + 1 + (c.respostas ? c.respostas.length : 0), 0)})
              </h4>
              <div class="comments-list" id="pinCommentsList">
                ${comentarios.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.9rem;">Seja o primeiro a comentar nesta ideia!</p>' : comentarios.map(c => `
                  <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                    <div class="comment-item">
                      <img src="${c.autor_foto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(c.autor_nome)}" />
                      <div class="comment-bubble">
                        <span class="comment-author-name">${c.autor_nome}</span>
                        <span>${c.texto}</span>
                      </div>
                      ${(this.state.currentUser && (this.state.currentUser.id === c.usuario_id || isAuthor || isMod)) ? `
                        <button style="background: transparent; border: none; cursor: pointer; color: #dc3545; font-size: 0.85rem; display: flex; align-items: center;" onclick="App.deleteComment('${c.id}', '${pin.id}')">
                          <i data-lucide="trash-2" class="icon-xs"></i>
                        </button>
                      ` : ''}
                    </div>

                    <div style="margin-left: 42px; display: flex; gap: 10px; align-items: center;">
                      ${this.state.currentUser ? `
                        <button style="background: none; border: none; font-size: 0.78rem; font-weight: 700; color: var(--primary); cursor: pointer; display: flex; align-items: center; gap: 3px;" onclick="App.setReplyingTo('${c.id}', '${c.autor_nome}')">
                          <i data-lucide="reply" class="icon-xs"></i> Responder
                        </button>
                      ` : ''}
                    </div>

                    <!-- Respostas Aninhadas ao Comentário -->
                    ${(c.respostas && c.respostas.length > 0) ? `
                      <div style="margin-left: 36px; margin-top: 4px; border-left: 2px solid #e0e0e0; padding-left: 10px; display: flex; flex-direction: column; gap: 8px;">
                        ${c.respostas.map(r => `
                          <div class="comment-item" style="font-size: 0.85rem;">
                            <img src="${r.autor_foto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(r.autor_nome)}" style="width: 26px; height: 26px; border-radius: 50%;" />
                            <div class="comment-bubble" style="background: #e9ecef; padding: 6px 12px; border-radius: 12px; flex: 1;">
                              <span class="comment-author-name">${r.autor_nome}</span>
                              <span>${r.texto}</span>
                            </div>
                            ${(this.state.currentUser && (this.state.currentUser.id === r.usuario_id || isAuthor || isMod)) ? `
                              <button style="background: transparent; border: none; cursor: pointer; color: #dc3545; font-size: 0.75rem; display: flex; align-items: center;" onclick="App.deleteComment('${r.id}', '${pin.id}')">
                                <i data-lucide="trash-2" class="icon-xs"></i>
                              </button>
                            ` : ''}
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>

              ${this.state.currentUser ? `
                <div id="replyingBadge" style="display: none; align-items: center; justify-content: space-between; background: #e8f0fe; color: #1a73e8; padding: 6px 12px; border-radius: 8px; font-size: 0.82rem; margin-top: 8px;">
                  <span id="replyingText">Respondendo a <strong>@Autor</strong></span>
                  <button type="button" style="background: none; border: none; cursor: pointer; color: #5f6368; font-weight: 700; font-size: 0.85rem;" onclick="App.cancelReply()">✕</button>
                </div>
                <form onsubmit="App.handleSendComment(event, '${pin.id}')" style="display: flex; gap: 8px; margin-top: 8px;">
                  <input type="text" id="commentTextInput" class="form-control" placeholder="Adicione um comentário ou responda..." required style="border-radius: var(--border-radius-full);" />
                  <button type="submit" class="btn btn-primary">
                    <i data-lucide="send" class="icon-sm"></i>
                  </button>
                </form>
              ` : `
                <div style="background: #f7f7f7; padding: 12px; border-radius: var(--border-radius-md); text-align: center; font-size: 0.9rem;">
                  <a href="#" onclick="App.openAuthModal('login')" style="color: var(--primary); font-weight: 700;">Faça login</a> para comentar ou responder.
                </div>
              `}
            </div>
          </div>
        </div>
      `;

      modal.classList.add('show');
      this.refreshIcons();
    } catch (e) {
      this.showToast(`Erro ao abrir detalhes: ${e.message}`);
    }
  },

  setReplyingTo(commentId, authorName) {
    this.state.replyingTo = { commentId, authorName };
    const badge = document.getElementById('replyingBadge');
    const text = document.getElementById('replyingText');
    const input = document.getElementById('commentTextInput');

    if (badge && text) {
      text.innerHTML = `<i data-lucide="reply" class="icon-xs"></i> Respondendo a <strong>@${authorName}</strong>`;
      badge.style.display = 'flex';
      this.refreshIcons();
    }
    if (input) {
      input.placeholder = `Respondendo a @${authorName}...`;
      input.focus();
    }
  },

  cancelReply() {
    this.state.replyingTo = null;
    const badge = document.getElementById('replyingBadge');
    const input = document.getElementById('commentTextInput');
    if (badge) badge.style.display = 'none';
    if (input) input.placeholder = 'Adicione um comentário ou responda...';
  },

  // RF006 – Curtir Pin
  async toggleLike(pinId, fromDetail = false) {
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }
    try {
      const res = await API.toggleLike(pinId);
      this.showToast(res.message);
      if (fromDetail) {
        this.openPinDetails(pinId);
      } else {
        this.loadFeed();
      }
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // RF006 – Enviar Comentário / Resposta
  async handleSendComment(event, pinId) {
    event.preventDefault();
    const input = document.getElementById('commentTextInput');
    const texto = input.value.trim();
    if (!texto) return;

    try {
      const formData = new FormData();
      formData.append('texto', texto);
      if (this.state.replyingTo && this.state.replyingTo.commentId) {
        formData.append('parentId', this.state.replyingTo.commentId);
      }
      await API.addComment(pinId, formData);
      input.value = '';
      this.state.replyingTo = null;
      this.openPinDetails(pinId);
    } catch (e) {
      this.showToast(`Erro ao enviar comentário: ${e.message}`);
    }
  },

  async deleteComment(commentId, pinId) {
    if (!confirm('Deseja excluir este comentário?')) return;
    try {
      await API.deleteComment(commentId);
      this.showToast('Comentário excluído.');
      this.openPinDetails(pinId);
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // RF002 & RNE002 – Excluir Pin Definitivamente
  async confirmDeletePin(pinId) {
    if (!confirm('ATENÇÃO (Regra RNE002):\nTem certeza que deseja excluir este Pin definitivamente?\nTodas as referências salvas em pastas de outros usuários também serão removidas.')) {
      return;
    }
    try {
      const res = await API.deletePin(pinId);
      this.showToast(res.message);
      this.closeAllModals();
      this.loadFeed();
    } catch (e) {
      this.showToast(`Erro ao excluir: ${e.message}`);
    }
  },

  // RF003 & RF006 – Salvar Pin em Pasta
  async openSaveModal(pinId) {
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }

    try {
      const data = await API.getBoards({ usuarioId: this.state.currentUser.id });
      const boards = data.pastas || [];

      const modal = document.getElementById('savePinModal');
      const container = document.getElementById('saveBoardsList');

      container.innerHTML = boards.map(b => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: var(--border-radius-sm); background: #f7f7f7; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="${b.visibilidade === 'secreta' ? 'lock' : 'folder'}" class="icon-sm"></i>
              ${b.titulo}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${b.visibilidade === 'secreta' ? 'Pasta Secreta' : 'Pública'} • ${b.total_pins || 0} pins</div>
          </div>
          <button class="btn btn-primary" onclick="App.savePinToBoard('${b.id}', '${pinId}')">
            <i data-lucide="bookmark" class="icon-sm"></i> Salvar
          </button>
        </div>
      `).join('');

      document.getElementById('btnCreateBoardInSave').onclick = () => {
        App.openCreateBoardModal(pinId);
      };

      modal.classList.add('show');
      this.refreshIcons();
    } catch (e) {
      this.showToast(`Erro ao buscar pastas: ${e.message}`);
    }
  },

  async savePinToBoard(boardId, pinId) {
    try {
      const res = await API.savePinToBoard(boardId, pinId);
      this.showToast(res.message);
      document.getElementById('savePinModal').classList.remove('show');
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // RF004 – Stylety Lens (Busca Visual)
  openLensModal() {
    const modal = document.getElementById('lensModal');
    document.getElementById('lensPreviewContainer').style.display = 'none';
    document.getElementById('lensResultsGrid').innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Carregue uma imagem ou clique na câmera em um Pin para encontrar ideias semelhantes.</p>';
    modal.classList.add('show');
    this.refreshIcons();
  },

  async openLensModalWithPin(pinId) {
    this.openLensModal();
    try {
      const data = await API.getPinById(pinId);
      const pin = data.pin;
      document.getElementById('lensPreviewImg').src = pin.midia_url;
      document.getElementById('lensPreviewContainer').style.display = 'block';

      const formData = new FormData();
      formData.append('targetTag', pin.categoria);
      if (pin.tags && pin.tags.length > 0) {
        formData.append('categoria', pin.tags[0]);
      }

      document.getElementById('lensResultsGrid').innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div> Analisando similaridade visual...</div>';

      const results = await API.searchLens(formData);
      this.renderPins(results.pins || [], document.getElementById('lensResultsGrid'));
    } catch (e) {
      this.showToast(`Erro na busca Lens: ${e.message}`);
    }
  },

  async handleLensUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      document.getElementById('lensPreviewImg').src = e.target.result;
      document.getElementById('lensPreviewContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('imagem', file);

    const resultsGrid = document.getElementById('lensResultsGrid');
    resultsGrid.innerHTML = '<div style="text-align: center; padding: 30px;"><div class="spinner"></div> Processando imagem...</div>';

    try {
      const results = await API.searchLens(formData);
      this.renderPins(results.pins || [], resultsGrid);
    } catch (err) {
      resultsGrid.innerHTML = `<p style="color: #dc3545;">Erro na busca visual: ${err.message}</p>`;
    }
  },

  // RF004 – Pesquisa Textual
  async handleSearch(query) {
    if (!query) {
      this.loadFeed();
      return;
    }
    const container = document.getElementById('masonryFeed');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="spinner"></div> Pesquisando ideias...</div>';

    try {
      const results = await API.search({ q: query, tipo: this.state.searchType });
      if (this.state.searchType === 'perfis') {
        this.renderProfilesSearch(results.perfis || [], container);
      } else if (this.state.searchType === 'pastas') {
        this.renderBoardsSearch(results.pastas || [], container);
      } else {
        this.renderPins(results.pins || [], container);
      }
      document.getElementById('searchDropdown').classList.remove('show');
    } catch (e) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #dc3545;">Erro na busca: ${e.message}</div>`;
    }
  },

  renderProfilesSearch(profiles, container) {
    if (profiles.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum perfil encontrado.</p>';
      return;
    }
    container.innerHTML = profiles.map(p => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 24px; text-align: center; margin-bottom: 16px; break-inside: avoid;">
        <img src="${p.foto_perfil_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(p.nome)}" style="width: 76px; height: 76px; border-radius: 50%; margin-bottom: 10px; object-fit: cover;" />
        <h3 style="font-size: 1.1rem; font-weight: 700;">${p.nome}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">${p.bio || 'Sem biografia'}</p>
        <button class="btn btn-primary" onclick="App.openUserProfile('${p.id}')">
          <i data-lucide="user" class="icon-sm"></i> Ver Perfil
        </button>
      </div>
    `).join('');
    this.refreshIcons();
  },

  renderBoardsSearch(boards, container) {
    if (boards.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhuma pasta encontrada.</p>';
      return;
    }
    container.innerHTML = boards.map(b => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); overflow: hidden; margin-bottom: 16px; break-inside: avoid; cursor: pointer;" onclick="App.openBoardDetails('${b.id}')">
        <div style="height: 140px; background: #eee; overflow: hidden;">
          ${b.capa_url ? `<img src="${b.capa_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><i data-lucide="folder" class="icon-lg"></i></div>`}
        </div>
        <div style="padding: 14px;">
          <h3 style="font-size: 1.05rem; font-weight: 700;">${b.titulo}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${b.total_pins || 0} pins • Por ${b.autor_nome}</div>
        </div>
      </div>
    `).join('');
    this.refreshIcons();
  },

  // RF007 – Seguir Usuário
  async toggleFollow(userId) {
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }
    try {
      const res = await API.toggleFollow(userId);
      this.showToast(res.message);
      this.openUserProfile(userId);
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // RF001 & RF007 – Visualizar Perfil de Usuário
  async openUserProfile(userId) {
    try {
      const data = await API.getUserProfile(userId);
      const perfil = data.perfil;
      const pastas = data.pastas || [];
      const pins = data.pins || [];

      const modal = document.getElementById('profileViewModal');
      const content = document.getElementById('profileViewContent');

      content.innerHTML = `
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid var(--border-color);">
          <img src="${perfil.foto_perfil_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(perfil.nome)}" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; margin-bottom: 12px;" />
          <h2 style="font-size: 1.8rem; font-weight: 700;">${perfil.nome}</h2>
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center; margin: 6px 0;">
            <span style="font-size: 0.85rem; background: #f0f0f0; padding: 4px 12px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;">
              <i data-lucide="${perfil.tipo_conta === 'business' ? 'briefcase' : 'user'}" class="icon-xs"></i>
              ${perfil.tipo_conta === 'business' ? 'Conta Comercial' : 'Conta Pessoal'}
            </span>
            ${perfil.perfil_privado ? `<span style="font-size: 0.85rem; background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="lock" class="icon-xs"></i> Perfil Privado (RNE001)</span>` : ''}
          </div>
          <p style="max-width: 540px; margin: 12px auto; color: var(--text-muted); font-size: 0.95rem;">${perfil.bio || 'Sem biografia informada.'}</p>
          <div style="display: flex; justify-content: center; gap: 24px; font-size: 1rem; font-weight: 700; margin: 18px 0;">
            <span>${perfil.seguidores_count} seguidores</span>
            <span>${perfil.seguindo_count} seguindo</span>
            <span>${perfil.pins_count} pins</span>
          </div>

          <div style="display: flex; justify-content: center; gap: 10px;">
            ${!perfil.isOwner ? `
              <button class="btn btn-primary" onclick="App.toggleFollow('${perfil.id}')">
                <i data-lucide="${perfil.isFollowing ? 'user-minus' : 'user-plus'}" class="icon-sm"></i>
                ${perfil.isFollowing ? 'Deixar de Seguir' : 'Seguir'}
              </button>
              <button class="btn btn-secondary" onclick="App.openDirectChat('${perfil.id}', '${perfil.nome}')">
                <i data-lucide="message-square" class="icon-sm"></i> Mensagem
              </button>
              <button class="btn btn-secondary" onclick="App.openReportModal('perfil', '${perfil.id}')" title="Denunciar">
                <i data-lucide="flag" class="icon-sm"></i>
              </button>
            ` : `
              <button class="btn btn-secondary" onclick="App.openLGPDModal()">
                <i data-lucide="shield-check" class="icon-sm"></i> Privacidade & LGPD
              </button>
            `}
          </div>
        </div>

        <div style="padding: 24px 0;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="folder" class="icon-sm"></i> Pastas (${pastas.length})
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
            ${pastas.length === 0 ? '<p style="color: var(--text-muted);">Nenhuma pasta pública criada.</p>' : pastas.map(b => `
              <div style="border: 1px solid var(--border-color); border-radius: var(--border-radius-md); overflow: hidden; cursor: pointer;" onclick="App.openBoardDetails('${b.id}')">
                <div style="height: 120px; background: #eee;">
                  ${b.capa_url ? `<img src="${b.capa_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : ''}
                </div>
                <div style="padding: 12px;">
                  <div style="font-weight: 700;">${b.titulo}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">${b.total_pins || 0} pins</div>
                </div>
              </div>
            `).join('')}
          </div>

          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="image" class="icon-sm"></i> Pins (${pins.length})
          </h3>
          <div class="masonry-grid" id="profilePinsGrid">
            ${pins.length === 0 ? '<p style="color: var(--text-muted);">Nenhum Pin criado ainda.</p>' : ''}
          </div>
        </div>
      `;

      if (pins.length > 0) {
        this.renderPins(pins, document.getElementById('profilePinsGrid'));
      }

      modal.classList.add('show');
      this.refreshIcons();
    } catch (e) {
      this.showToast(`Erro ao abrir perfil: ${e.message}`);
    }
  },

  // RF003 – Detalhes de Pasta (Board)
  async openBoardDetails(boardId) {
    try {
      const data = await API.getBoardById(boardId);
      const board = data.pasta;
      const pins = data.pins || [];
      const colaboradores = data.colaboradores || [];
      const canEdit = data.canEdit;

      const modal = document.getElementById('boardViewModal');
      const content = document.getElementById('boardViewContent');

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
          <div>
            <h2 style="font-size: 1.8rem; font-weight: 700;">${board.titulo}</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem;">${board.descricao || 'Sem descrição'}</p>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px; font-size: 0.85rem;">
              <span style="display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="${board.visibilidade === 'secreta' ? 'lock' : 'globe'}" class="icon-xs"></i>
                ${board.visibilidade === 'secreta' ? 'Pasta Secreta (RNE002)' : 'Pasta Pública'}
              </span>
              <span>• Por ${board.autor_nome}</span>
              <span>• ${pins.length} ideias</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            ${canEdit ? `
              <button class="btn btn-secondary" onclick="App.openInviteCollaboratorModal('${board.id}')">
                <i data-lucide="user-plus" class="icon-sm"></i> Convidar
              </button>
            ` : ''}
            ${data.isOwner ? `
              <button class="btn btn-danger" onclick="App.deleteBoard('${board.id}')">
                <i data-lucide="trash-2" class="icon-sm"></i> Excluir
              </button>
            ` : ''}
          </div>
        </div>

        ${colaboradores.length > 0 ? `
          <div style="padding: 12px 0; display: flex; gap: 8px; align-items: center; font-size: 0.9rem;">
            <strong>Colaboradores:</strong>
            ${colaboradores.map(c => `
              <span style="background: #f0f0f0; padding: 4px 10px; border-radius: 12px;">${c.nome} (${c.permissao})</span>
            `).join('')}
          </div>
        ` : ''}

        <div style="padding: 20px 0;">
          <div class="masonry-grid" id="boardPinsGrid"></div>
        </div>
      `;

      modal.classList.add('show');
      this.renderPins(pins, document.getElementById('boardPinsGrid'));
      this.refreshIcons();
    } catch (e) {
      this.showToast(`Erro ao carregar pasta: ${e.message}`);
    }
  },

  async deleteBoard(boardId) {
    if (!confirm('Deseja realmente excluir esta pasta?')) return;
    try {
      await API.deleteBoard(boardId);
      this.showToast('Pasta excluída com sucesso.');
      this.closeAllModals();
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  openInviteCollaboratorModal(boardId) {
    const email = prompt('Digite o e-mail ou nome do usuário para colaborar nesta pasta:');
    if (!email) return;
    API.inviteCollaborator(boardId, email.trim())
      .then(res => {
        this.showToast(res.message);
        this.openBoardDetails(boardId);
      })
      .catch(err => this.showToast(err.message));
  },

  // RF008 & RNE003 – Denúncia de Conteúdo
  openReportModal(tipoAlvo, alvoId) {
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }
    const modal = document.getElementById('reportModal');
    document.getElementById('reportTipoAlvo').value = tipoAlvo;
    document.getElementById('reportAlvoId').value = alvoId;
    modal.classList.add('show');
    this.refreshIcons();
  },

  async handleSendReport(event) {
    event.preventDefault();
    const tipoAlvo = document.getElementById('reportTipoAlvo').value;
    const alvoId = document.getElementById('reportAlvoId').value;
    const motivo = document.getElementById('reportMotivo').value;
    const detalhes = document.getElementById('reportDetalhes').value;

    try {
      const res = await API.reportContent({ tipoAlvo, alvoId, motivo, detalhes });
      this.showToast(res.message);
      if (res.avisoOcultacao) {
        this.showToast(res.avisoOcultacao);
      }
      this.closeAllModals();
      this.loadFeed();
    } catch (e) {
      this.showToast(`Erro ao enviar denúncia: ${e.message}`);
    }
  },

  // RF008 – Painel Administrativo de Moderação
  async openModerationPanel() {
    if (!this.state.currentUser || this.state.currentUser.role !== 'moderador') {
      this.showToast('Acesso restrito a moderadores.');
      return;
    }

    const modal = document.getElementById('moderationModal');
    const container = document.getElementById('moderationReportsList');
    container.innerHTML = '<div style="text-align: center; padding: 30px;"><div class="spinner"></div> Carregando denúncias...</div>';
    modal.classList.add('show');

    try {
      const data = await API.getModerationReports();
      const reports = data.denuncias || [];
      const stats = data.stats || {};

      document.getElementById('modStatPendentes').textContent = stats.pendentes || 0;
      document.getElementById('modStatAnalisadas').textContent = stats.analisadas || 0;
      document.getElementById('modStatTotal').textContent = stats.total || 0;

      if (reports.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">Nenhuma denúncia pendente.</p>';
        return;
      }

      container.innerHTML = reports.map(r => {
        const slaHours = parseFloat(r.horasRestantes);
        let slaClass = 'ok';
        if (slaHours < 12) slaClass = 'danger';
        else if (slaHours < 24) slaClass = 'warning';

        return `
          <div class="moderation-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <span class="sla-badge ${slaClass}">
                  <i data-lucide="clock" class="icon-xs"></i>
                  SLA 48h (RNE003): ${slaHours > 0 ? slaHours + 'h restantes' : 'SLA Expirado'}
                </span>
                <span style="margin-left: 8px; font-weight: 700; text-transform: uppercase; font-size: 0.8rem;">
                  Alvo: ${r.tipo_alvo}
                </span>
              </div>
              <span style="font-size: 0.85rem; font-weight: 700; color: ${r.status === 'pendente' ? '#e60023' : '#28a745'};">
                Status: ${r.status}
              </span>
            </div>

            <div style="font-size: 0.95rem; margin-bottom: 8px;">
              <strong>Motivo:</strong> ${r.motivo}
            </div>
            ${r.detalhes ? `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">"${r.detalhes}"</div>` : ''}

            ${r.alvoDetalhes ? `
              <div style="background: #f7f7f7; padding: 10px; border-radius: var(--border-radius-sm); margin-bottom: 12px; font-size: 0.88rem;">
                ${r.tipo_alvo === 'pin' ? `
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <img src="${r.alvoDetalhes.midia_url}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;" />
                    <div>
                      <strong>${r.alvoDetalhes.titulo}</strong>
                      <div>Autor: ${r.alvoDetalhes.autor_nome} (${r.alvoDetalhes.autor_status})</div>
                      ${r.alvoDetalhes.oculto_preventivo ? '<span style="color: #e60023; font-weight: 700;">Oculto preventivamente (RNE003)</span>' : ''}
                    </div>
                  </div>
                ` : r.tipo_alvo === 'comentario' ? `
                  <div>Comentário de ${r.alvoDetalhes.autor_nome}: "${r.alvoDetalhes.texto}"</div>
                ` : `
                  <div>Perfil: ${r.alvoDetalhes.nome} (${r.alvoDetalhes.email})</div>
                `}
              </div>
            ` : ''}

            ${r.status === 'pendente' ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="App.executeModAction('${r.id}', 'manter')">
                  <i data-lucide="check" class="icon-sm"></i> Manter
                </button>
                <button class="btn btn-danger" onclick="App.executeModAction('${r.id}', 'remover_conteudo')">
                  <i data-lucide="trash-2" class="icon-sm"></i> Remover
                </button>
                <button class="btn btn-secondary" onclick="App.executeModAction('${r.id}', 'suspender_usuario')">
                  <i data-lucide="pause-circle" class="icon-sm"></i> Suspender
                </button>
                <button class="btn btn-danger" onclick="App.executeModAction('${r.id}', 'banir_usuario')">
                  <i data-lucide="ban" class="icon-sm"></i> Banir (RNE003)
                </button>
              </div>
            ` : `
              <div style="font-size: 0.85rem; color: var(--text-muted);">Decisão: ${r.decisao}</div>
            `}
          </div>
        `;
      }).join('');
      this.refreshIcons();
    } catch (e) {
      container.innerHTML = `<p style="color: #dc3545;">Erro: ${e.message}</p>`;
    }
  },

  async executeModAction(reportId, acao) {
    const justificativa = prompt('Justificativa da moderação (opcional):') || '';
    try {
      const res = await API.executeModerationAction(reportId, { acao, justificativa });
      this.showToast(res.mensagemAcao || res.message);
      this.openModerationPanel();
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // RNF006 – Backup
  async handleCreateBackup() {
    try {
      this.showToast('Gerando backup automático do banco de dados (RNF006)...');
      const res = await API.createBackup();
      this.showToast(res.message);
    } catch (e) {
      this.showToast(`Erro no backup: ${e.message}`);
    }
  },

  // RF006 – Chat Drawer
  openDirectChat(targetUserId, targetUserName) {
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }

    this.state.activeChatUser = { id: targetUserId, nome: targetUserName };
    const drawer = document.getElementById('chatDrawer');
    document.getElementById('chatHeaderTitle').innerHTML = `<i data-lucide="message-square" class="icon-sm"></i> ${targetUserName}`;
    drawer.classList.add('open');
    this.loadDirectMessages(targetUserId);
    this.refreshIcons();
  },

  async loadDirectMessages(targetUserId) {
    try {
      const data = await API.getMessagesWithUser(targetUserId);
      const container = document.getElementById('chatMessagesContainer');
      const msgs = data.messages || [];

      container.innerHTML = msgs.map(m => {
        const isSelf = m.remetente_id === this.state.currentUser.id;
        return `
          <div class="${isSelf ? 'chat-bubble-self' : 'chat-bubble-other'}">
            ${m.texto ? `<div>${m.texto}</div>` : ''}
            ${m.pin_id ? `
              <div style="margin-top: 6px; padding: 4px; background: rgba(0,0,0,0.1); border-radius: 6px; cursor: pointer;" onclick="App.openPinDetails('${m.pin_id}')">
                <img src="${m.pin_midia_url}" style="width: 100%; max-height: 80px; object-fit: cover; border-radius: 4px;" />
                <div style="font-size: 0.75rem; font-weight: 700; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                  <i data-lucide="bookmark" class="icon-xs"></i> ${m.pin_titulo}
                </div>
              </div>
            ` : ''}
            <div style="font-size: 0.65rem; opacity: 0.8; margin-top: 2px; text-align: right;">
              ${new Date(m.data_criacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        `;
      }).join('');

      container.scrollTop = container.scrollHeight;
    } catch (e) {
      console.error('Erro no chat:', e);
    }
  },

  async handleSendDirectMessage(event) {
    event.preventDefault();
    if (!this.state.activeChatUser) return;
    const input = document.getElementById('chatTextInput');
    const texto = input.value.trim();
    if (!texto) return;

    try {
      await API.sendMessage({
        destinatarioId: this.state.activeChatUser.id,
        texto
      });
      input.value = '';
      this.loadDirectMessages(this.state.activeChatUser.id);
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // RF007 – Central de Notificações
  async loadNotifications() {
    if (!this.state.currentUser) return;
    try {
      const data = await API.getNotifications();
      this.state.notifications = data.notificacoes || [];
      this.state.unreadNotifs = data.unreadCount || 0;

      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.textContent = this.state.unreadNotifs;
        badge.style.display = this.state.unreadNotifs > 0 ? 'flex' : 'none';
      }

      const list = document.getElementById('notifList');
      if (list) {
        list.innerHTML = this.state.notifications.map(n => `
          <div class="dropdown-item ${!n.lida ? 'unread' : ''}" style="display: flex; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border-color); ${!n.lida ? 'background: var(--primary-light);' : ''}" onclick="App.handleNotifClick('${n.id}', '${n.link_alvo}')">
            <img src="${n.remetente_foto || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(n.remetente_nome || 'Sistema')}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;" />
            <div style="flex: 1; font-size: 0.88rem;">
              <div>${n.mensagem}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(n.data_criacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {}
  },

  async handleNotifClick(notifId, linkAlvo) {
    try {
      await API.markNotificationRead(notifId);
      this.loadNotifications();
      if (linkAlvo && linkAlvo.startsWith('/pin/')) {
        const pinId = linkAlvo.replace('/pin/', '');
        this.openPinDetails(pinId);
      }
    } catch (e) {}
  },

  startNotificationPolling() {
    setInterval(() => {
      if (this.state.currentUser) {
        this.loadNotifications();
      }
    }, 15000);
  },

  // RNF003 & RNE004 – LGPD Modal
  openLGPDModal() {
    const modal = document.getElementById('lgpdModal');
    modal.classList.add('show');
    this.refreshIcons();
  },

  exportMyData() {
    API.exportUserData();
    this.showToast('Exportando seus dados pessoais em JSON (LGPD)...');
  },

  async requestAccountDeletion() {
    if (!confirm('CONFIRMAÇÃO LGPD (Regra RNE004):\nTem certeza que deseja agendar a exclusão da sua conta?\nSeus dados serão retidos e permanentemente anonimizados em até 30 dias.')) {
      return;
    }
    try {
      const res = await API.requestAccountDeletion();
      this.showToast(res.message);
      this.closeAllModals();
      this.logout();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // Modais de Criação
  openCreatePinModal() {
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }
    this.closeAllModals();
    const modal = document.getElementById('createPinModal');
    API.getBoards({ usuarioId: this.state.currentUser.id }).then(res => {
      const select = document.getElementById('createPinBoardSelect');
      select.innerHTML = '<option value="">Sem pasta inicial</option>' + (res.pastas || []).map(b => `<option value="${b.id}">${b.titulo}</option>`).join('');
    });
    modal.classList.add('show');
    this.refreshIcons();
  },

  async handleCreatePinSubmit(event) {
    event.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('createPinFileInput');
    const urlInput = document.getElementById('createPinUrlInput').value.trim();

    if (fileInput.files[0]) {
      formData.append('midia', fileInput.files[0]);
    } else if (urlInput) {
      formData.append('midiaUrl', urlInput);
    } else {
      this.showToast('Selecione uma imagem/vídeo ou insira uma URL.');
      return;
    }

    formData.append('titulo', document.getElementById('createPinTitulo').value.trim());
    formData.append('descricao', document.getElementById('createPinDescricao').value.trim());
    formData.append('textoAlternativo', document.getElementById('createPinAltText').value.trim());
    formData.append('linkDestino', document.getElementById('createPinLinkDestino').value.trim());
    formData.append('categoria', document.getElementById('createPinCategoria').value);
    
    const tags = document.getElementById('createPinTags').value.split(',').map(t => t.trim()).filter(Boolean);
    formData.append('tags', JSON.stringify(tags));

    const boardId = document.getElementById('createPinBoardSelect').value;
    if (boardId) formData.append('pastaId', boardId);

    try {
      this.showToast('Processando mídia com compressão WebP (RNF001)...');
      const res = await API.createPin(formData);
      this.showToast(res.message);
      this.closeAllModals();
      this.loadFeed();
    } catch (e) {
      this.showToast(`Erro ao criar Pin: ${e.message}`);
    }
  },

  openCreateBoardModal(pinIdToSave = null) {
    this.closeAllModals();
    const titulo = prompt('Nome da pasta:');
    if (!titulo) return;
    const categoria = prompt('Categoria (ex: Design, Arquitetura, Gastronomia, Viagens):') || 'Geral';
    const secreta = confirm('Deseja que esta pasta seja SECRETA/PRIVADA? (Regra RNE002: nunca será exibida publicamente)');

    API.createBoard({
      titulo,
      categoria,
      visibilidade: secreta ? 'secreta' : 'publica'
    }).then(res => {
      this.showToast(res.message);
      if (pinIdToSave) {
        this.savePinToBoard(res.pasta.id, pinIdToSave);
      }
    }).catch(err => this.showToast(err.message));
  },

  // Auth Modal
  openAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    this.switchAuthTab(mode);
    modal.classList.add('show');
    this.refreshIcons();
  },

  switchAuthTab(mode) {
    document.getElementById('loginFormContainer').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('registerFormContainer').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('authTabLogin').classList.toggle('active', mode === 'login');
    document.getElementById('authTabRegister').classList.toggle('active', mode === 'register');
  },

  async handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;
    const twoFactorCode = document.getElementById('login2FACode')?.value.trim();

    try {
      const res = await API.login({ email, senha, twoFactorCode });
      if (res.requires2FA) {
        document.getElementById('twoFactorContainer').style.display = 'block';
        this.showToast('Digite seu código 2FA');
        this.refreshIcons();
        return;
      }
      API.setToken(res.token);
      this.state.currentUser = res.user;
      this.updateUserUI();
      this.closeAllModals();
      this.showToast(`Bem-vindo(a), ${res.user.nome}!`);
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  async handleRegisterSubmit(event) {
    event.preventDefault();
    const nome = document.getElementById('regNome').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const senha = document.getElementById('regSenha').value;
    const dataNascimento = document.getElementById('regDataNascimento').value;
    const tipoConta = document.getElementById('regTipoConta').value;

    const age = this.calculateAge(dataNascimento);
    if (age < 13) {
      this.showToast('Erro RNE001: Idade mínima de 13 anos exigida.');
      return;
    }

    try {
      const res = await API.register({ nome, email, senha, dataNascimento, tipoConta });
      API.setToken(res.token);
      this.state.currentUser = res.user;
      this.updateUserUI();
      this.closeAllModals();
      this.showToast(res.message);
      if (res.isMinorNotice) {
        this.showToast(res.isMinorNotice);
      }
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  async handleSocialLogin(provider) {
    try {
      const mockEmail = `${provider.toLowerCase()}_user@stylety.local`;
      const res = await API.socialLogin({
        provider,
        email: mockEmail,
        nome: `Usuário ${provider}`,
        dataNascimento: '1998-05-20'
      });
      API.setToken(res.token);
      this.state.currentUser = res.user;
      this.updateUserUI();
      this.closeAllModals();
      this.showToast(res.message);
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  // Botão Flutuante de Debug (Ícone Inseto)
  openDebugModal() {
    const modal = document.getElementById('debugModal');
    modal.classList.add('show');
    this.refreshIcons();
  },

  async quickLoginAs(email, senha = 'senha123') {
    try {
      const res = await API.login({ email, senha, twoFactorCode: '123456' });
      API.setToken(res.token);
      this.state.currentUser = res.user;
      this.updateUserUI();
      this.showToast(`Conectado como: ${res.user.nome} (${res.user.role})`);
      this.loadFeed();
    } catch (e) {
      this.showToast(e.message);
    }
  },

  logout() {
    API.setToken(null);
    this.state.currentUser = null;
    this.updateUserUI();
    this.showToast('Você saiu da sua conta.');
    this.loadFeed();
  },

  openShareModal(pinId) {
    const url = `${window.location.origin}/pin/${pinId}`;
    if (navigator.share) {
      navigator.share({ title: 'Stylety Idea', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      this.showToast('Link copiado!');
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
    document.getElementById('chatDrawer')?.classList.remove('open');
    document.getElementById('userDropdownMenu')?.classList.remove('show');
    document.getElementById('createDropdownMenu')?.classList.remove('show');
    document.getElementById('notifDropdownMenu')?.classList.remove('show');
    document.getElementById('searchDropdown')?.classList.remove('show');
  },

  showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="info" class="icon-sm"></i> <span>${message}</span>`;
    container.appendChild(toast);
    this.refreshIcons();
    setTimeout(() => {
      toast.remove();
    }, 4000);
  },

  toggleCreateMenu() {
    document.getElementById('createDropdownMenu').classList.toggle('show');
    this.refreshIcons();
  },

  toggleUserMenu() {
    document.getElementById('userDropdownMenu').classList.toggle('show');
    this.refreshIcons();
  },

  toggleNotifMenu() {
    document.getElementById('notifDropdownMenu').classList.toggle('show');
    this.refreshIcons();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    let timeout = null;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(timeout);
      const val = e.target.value;
      if (val.length >= 2) {
        API.getSuggestions(val).then(res => {
          const list = document.getElementById('searchSuggestionsList');
          list.innerHTML = (res.sugestoes || []).map(s => `
            <div class="suggestion-item" onclick="App.selectSuggestion('${s}')">
              <i data-lucide="search" class="icon-sm"></i>
              <span>${s}</span>
            </div>
          `).join('');
          document.getElementById('searchDropdown').classList.add('show');
          this.refreshIcons();
        });
      } else {
        document.getElementById('searchDropdown').classList.remove('show');
      }
      timeout = setTimeout(() => this.handleSearch(val), 500);
    });

    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch(e.target.value);
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-profile-btn') && !e.target.closest('#userDropdownMenu')) {
        document.getElementById('userDropdownMenu')?.classList.remove('show');
      }
      if (!e.target.closest('#btnCreateNav') && !e.target.closest('#createDropdownMenu')) {
        document.getElementById('createDropdownMenu')?.classList.remove('show');
      }
      if (!e.target.closest('#btnNotifications') && !e.target.closest('#notifDropdownMenu')) {
        document.getElementById('notifDropdownMenu')?.classList.remove('show');
      }
      if (!e.target.closest('.search-container')) {
        document.getElementById('searchDropdown')?.classList.remove('show');
      }
    });
  },

  selectSuggestion(term) {
    document.getElementById('searchInput').value = term;
    this.handleSearch(term);
  },

  setSearchFilter(tipo) {
    this.state.searchType = tipo;
    document.querySelectorAll('.search-filters-bar .filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.type === tipo);
    });
    this.handleSearch(document.getElementById('searchInput').value);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
