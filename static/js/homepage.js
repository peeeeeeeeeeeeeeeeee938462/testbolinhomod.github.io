/**
 * BolinhoMod Homepage JavaScript
 * Supabase Integration for Projects and Auth
 */

// ==================== //
// CONFIGURATION        //
// ==================== //

const SUPABASE_URL = 'https://dbynkicetjbzeipuufow.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TgAX-fyqgyDfdZcq5Rw0Yw_Ba65ujlf';

// Initialize Supabase client
let supabase = null;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('Failed to initialize Supabase:', e);
}

// ==================== //
// STATE               //
// ==================== //

let currentUser = null;
let currentProject = null;
let projectsOffset = 0;
const PROJECTS_LIMIT = 12;

// ==================== //
// DOM ELEMENTS        //
// ==================== //

const elements = {
    // Navigation
    navAuth: document.getElementById('navAuth'),
    mobileMenu: document.getElementById('mobileMenu'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileAuth: document.getElementById('mobileAuth'),
    
    // Stats
    totalProjects: document.getElementById('totalProjects'),
    totalUsers: document.getElementById('totalUsers'),
    
    // Projects
    featuredProjects: document.getElementById('featuredProjects'),
    loadMoreProjects: document.getElementById('loadMoreProjects'),
    myProjectsGrid: document.getElementById('myProjectsGrid'),
    searchMyProjects: document.getElementById('searchMyProjects'),
    
    // My Stuff
    myStuffSection: document.getElementById('my-stuff-section'),
    
    // Modals
    authModal: document.getElementById('authModal'),
    reportModal: document.getElementById('reportModal'),
    projectModal: document.getElementById('projectModal'),
    
    // Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    reportForm: document.getElementById('reportForm'),
    
    // Buttons
    createProjectBtn: document.getElementById('createProjectBtn'),
    newProjectBtn: document.getElementById('newProjectBtn'),
    uploadProjectBtn: document.getElementById('uploadProjectBtn'),
    
    // File Input
    fileUploadInput: document.getElementById('fileUploadInput'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    
    // Auth elements
    authMessage: document.getElementById('authMessage'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    
    // Report
    reportProjectId: document.getElementById('reportProjectId'),
    reportSuccess: document.getElementById('reportSuccess'),
    
    // Preview
    projectPreviewContent: document.getElementById('projectPreviewContent')
};

// ==================== //
// UTILITY FUNCTIONS   //
// ==================== //

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
        <span class="toast-message">${message}</span>
    `;
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showLoading(show = true) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

function generateAvatar(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

// ==================== //
// AUTH FUNCTIONS      //
// ==================== //

async function checkAuthState() {
    if (!supabase) {
        updateNavForGuest();
        return;
    }
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            currentUser = session.user;
            updateNavForUser(session.user);
            loadUserProjects();
            showMyStuffSection();
        } else {
            updateNavForGuest();
        }
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                currentUser = session.user;
                updateNavForUser(session.user);
                loadUserProjects();
                showMyStuffSection();
            } else {
                currentUser = null;
                updateNavForGuest();
                hideMyStuffSection();
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        updateNavForGuest();
    }
}

function updateNavForGuest() {
    elements.navAuth.innerHTML = `
        <button class="btn btn-secondary" onclick="openAuthModal('login')">Entrar</button>
        <button class="btn btn-primary" onclick="openAuthModal('register')">Cadastrar</button>
    `;
    
    elements.mobileAuth.innerHTML = `
        <button class="btn btn-secondary" onclick="openAuthModal('login')" style="width: 100%;">Entrar</button>
        <button class="btn btn-primary" onclick="openAuthModal('register')" style="width: 100%;">Cadastrar</button>
    `;
}

function updateNavForUser(user) {
    const name = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
    const avatar = generateAvatar(name);
    
    elements.navAuth.innerHTML = `
        <div class="user-dropdown" id="userDropdown">
            <div class="nav-user" onclick="toggleUserDropdown()">
                <div class="nav-user-avatar">${avatar}</div>
                <span class="nav-user-name">${name}</span>
                <span>▼</span>
            </div>
            <div class="user-dropdown-menu">
                <a href="#" class="dropdown-item" onclick="scrollToMyStuff()">
                    <span>📁</span> Meus Projetos
                </a>
                <a href="#" class="dropdown-item" onclick="openProfile()">
                    <span>👤</span> Perfil
                </a>
                <a href="#" class="dropdown-item" onclick="openSettings()">
                    <span>⚙️</span> Configurações
                </a>
                <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid var(--border);">
                <a href="#" class="dropdown-item danger" onclick="logout()">
                    <span>🚪</span> Sair
                </a>
            </div>
        </div>
    `;
    
    elements.mobileAuth.innerHTML = `
        <div style="padding: 1rem; text-align: center;">
            <div style="margin-bottom: 1rem;">
                <div class="nav-user-avatar" style="width: 48px; height: 48px; font-size: 1.25rem; margin: 0 auto;">${avatar}</div>
                <strong>${name}</strong>
            </div>
            <button class="btn btn-secondary" onclick="logout()" style="width: 100%;">Sair</button>
        </div>
    `;
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.toggle('active');
}

async function logout() {
    if (!supabase) return;
    
    try {
        await supabase.auth.signOut();
        showToast('Você foi desconectado.', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Erro ao fazer logout.', 'error');
    }
}

async function login(email, password) {
    if (!supabase) {
        showToast('Sistema de login não disponível.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showToast('Login realizado com sucesso!', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage(error.message || 'Erro ao fazer login.', 'error');
    } finally {
        showLoading(false);
    }
}

async function register(email, password, username) {
    if (!supabase) {
        showToast('Sistema de registro não disponível.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username
                }
            }
        });
        
        if (error) throw error;
        
        showToast('Conta criada! Verifique seu email.', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Register error:', error);
        showAuthMessage(error.message || 'Erro ao criar conta.', 'error');
    } finally {
        showLoading(false);
    }
}

function showAuthMessage(message, type = 'error') {
    elements.authMessage.className = `auth-message ${type}`;
    elements.authMessage.textContent = message;
    elements.authMessage.style.display = 'block';
    
    setTimeout(() => {
        elements.authMessage.style.display = 'none';
    }, 5000);
}

// ==================== //
// MODAL FUNCTIONS     //
// ==================== //

function openAuthModal(tab = 'login') {
    elements.authModal.classList.add('active');
    switchAuthTab(tab);
}

function closeAuthModal() {
    elements.authModal.classList.remove('active');
    elements.loginForm.reset();
    elements.registerForm.reset();
    elements.authMessage.style.display = 'none';
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    elements.loginForm.style.display = tab === 'login' ? 'flex' : 'none';
    elements.registerForm.style.display = tab === 'register' ? 'flex' : 'none';
}

function openReportModal(projectId) {
    elements.reportProjectId.value = projectId;
    elements.reportModal.classList.add('active');
    elements.reportSuccess.style.display = 'none';
    elements.reportForm.style.display = 'flex';
}

function closeReportModal() {
    elements.reportModal.classList.remove('active');
    elements.reportForm.reset();
}

function openProjectModal(project) {
    currentProject = project;
    renderProjectPreview(project);
    elements.projectModal.classList.add('active');
}

function closeProjectModal() {
    elements.projectModal.classList.remove('active');
    currentProject = null;
}

function renderProjectPreview(project) {
    const thumbnail = project.thumbnail || '🎮';
    const authorName = project.author_name || 'Usuário';
    const authorAvatar = generateAvatar(authorName);
    
    elements.projectPreviewContent.innerHTML = `
        <div class="project-preview-header">
            <div class="project-preview-thumbnail">${thumbnail}</div>
            <div class="project-preview-info">
                <h2 class="project-preview-title">${project.title || 'Sem título'}</h2>
                <div class="project-preview-meta">
                    <span>👤 ${authorName}</span>
                    <span>📅 ${formatDate(project.created_at)}</span>
                </div>
                <p class="project-preview-description">${project.description || 'Sem descrição.'}</p>
            </div>
        </div>
        <div class="project-preview-actions">
            <a href="/playground?project=${project.id}" class="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Jogar
            </a>
            <button class="btn btn-secondary" onclick="openReportModal('${project.id}')">
                🚩 Reportar
            </button>
            <button class="btn btn-secondary" onclick="closeProjectModal()">Fechar</button>
        </div>
    `;
}

// ==================== //
// PROJECT FUNCTIONS   //
// ==================== //

async function loadFeaturedProjects(reset = true) {
    if (!supabase) {
        renderDemoProjects();
        return;
    }
    
    if (reset) {
        projectsOffset = 0;
        elements.featuredProjects.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Carregando projetos...</span>
            </div>
        `;
    }
    
    try {
        const { data, error, count } = await supabase
            .from('projects')
            .select('*', { count: 'exact' })
            .eq('published', true)
            .order('created_at', { ascending: false })
            .range(projectsOffset, projectsOffset + PROJECTS_LIMIT - 1);
        
        if (error) throw error;
        
        // Update total count
        if (elements.totalProjects && count !== null) {
            elements.totalProjects.textContent = count;
        }
        
        if (data.length === 0 && reset) {
            renderDemoProjects();
            return;
        }
        
        if (reset) {
            elements.featuredProjects.innerHTML = '';
        }
        
        data.forEach(project => {
            elements.featuredProjects.insertAdjacentHTML('beforeend', createProjectCard(project));
        });
        
        projectsOffset += data.length;
        
    } catch (error) {
        console.error('Load projects error:', error);
        renderDemoProjects();
    }
}

function renderDemoProjects() {
    const demoProjects = [
        { id: 'demo1', title: 'Jogo de Corrida', author_name: 'Criador1', created_at: new Date().toISOString() },
        { id: 'demo2', title: 'Aventura Espacial', author_name: 'Criador2', created_at: new Date().toISOString() },
        { id: 'demo3', title: 'Quebra-Cabeça', author_name: 'Criador3', created_at: new Date().toISOString() },
        { id: 'demo4', title: 'Labirinto', author_name: 'Criador4', created_at: new Date().toISOString() },
    ];
    
    elements.featuredProjects.innerHTML = demoProjects.map(p => createProjectCard(p)).join('');
    
    // Update stats with demo data
    if (elements.totalProjects) elements.totalProjects.textContent = '150+';
    if (elements.totalUsers) elements.totalUsers.textContent = '50+';
}

function createProjectCard(project) {
    const thumbnail = project.thumbnail || '🎮';
    const title = project.title || 'Sem título';
    const authorName = project.author_name || 'Usuário';
    const authorAvatar = generateAvatar(authorName);
    const views = project.views || 0;
    const loves = project.loves || 0;
    
    return `
        <div class="project-card" onclick="openProjectModal(${JSON.stringify(project).replace(/"/g, '&quot;')})">
            <div class="project-thumbnail">
                ${thumbnail}
                <div class="project-actions">
                    <button class="project-action-btn" onclick="event.stopPropagation(); toggleFavorite('${project.id}')" title="Favoritar">
                        ♥
                    </button>
                    <button class="project-action-btn" onclick="event.stopPropagation(); openReportModal('${project.id}')" title="Reportar">
                        🚩
                    </button>
                </div>
            </div>
            <div class="project-info">
                <h3 class="project-title">${title}</h3>
                <div class="project-meta">
                    <div class="project-author">
                        <div class="project-author-avatar">${authorAvatar}</div>
                        <span>${authorName}</span>
                    </div>
                    <div class="project-stats">
                        <span class="project-stat">👁 ${views}</span>
                        <span class="project-stat">♥ ${loves}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadUserProjects() {
    if (!supabase || !currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderUserProjects(data || []);
        
    } catch (error) {
        console.error('Load user projects error:', error);
        renderUserProjects([]);
    }
}

function renderUserProjects(projects) {
    if (projects.length === 0) {
        elements.myProjectsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3 class="empty-state-title">Nenhum projeto ainda</h3>
                <p class="empty-state-desc">Comece criando seu primeiro projeto!</p>
                <button class="btn btn-primary" onclick="createNewProject()">
                    Criar Projeto
                </button>
            </div>
        `;
        return;
    }
    
    elements.myProjectsGrid.innerHTML = projects.map(p => createProjectCard(p)).join('');
}

function searchUserProjects(query) {
    // For now, just reload all projects - could implement client-side filtering
    loadUserProjects();
}

async function toggleFavorite(projectId) {
    if (!supabase) {
        showToast('Sistema de favoritos não disponível.', 'error');
        return;
    }
    
    if (!currentUser) {
        openAuthModal('login');
        return;
    }
    
    try {
        const { data: existing } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('project_id', projectId)
            .single();
        
        if (existing) {
            await supabase.from('favorites').delete().eq('id', existing.id);
            showToast('Removido dos favoritos.', 'success');
        } else {
            await supabase.from('favorites').insert({
                user_id: currentUser.id,
                project_id: projectId
            });
            showToast('Adicionado aos favoritos!', 'success');
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        showToast('Erro ao favoritar.', 'error');
    }
}

async function submitReport(projectId, reason, description) {
    if (!supabase) {
        showToast('Sistema de reports não disponível.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase.from('reports').insert({
            project_id: projectId,
            user_id: currentUser?.id,
            reason,
            description,
            status: 'pending'
        });
        
        if (error) throw error;
        
        elements.reportForm.style.display = 'none';
        elements.reportSuccess.style.display = 'flex';
        
        setTimeout(() => {
            closeReportModal();
        }, 3000);
        
    } catch (error) {
        console.error('Submit report error:', error);
        showToast('Erro ao enviar report.', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== //
// CREATE/EDIT PROJECT //
// ==================== //

function createNewProject() {
    // Redirect to editor with new project
    window.location.href = '/playground';
}

function openUploadDialog() {
    elements.fileUploadInput.click();
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.sb3') && !file.name.endsWith('.zip')) {
        showToast('Formato não suportado. Use .sb3 ou .zip', 'error');
        return;
    }
    
    showToast('Upload ainda não implementado.', 'info');
    // TODO: Implement file upload to Supabase Storage
    event.target.value = '';
}

// ==================== //
// UI HELPERS          //
// ==================== //

function showMyStuffSection() {
    if (elements.myStuffSection) {
        elements.myStuffSection.style.display = 'block';
    }
}

function hideMyStuffSection() {
    if (elements.myStuffSection) {
        elements.myStuffSection.style.display = 'none';
    }
}

function scrollToMyStuff() {
    elements.myStuffSection?.scrollIntoView({ behavior: 'smooth' });
    toggleUserDropdown();
}

function openProfile() {
    showToast('Perfil em desenvolvimento.', 'info');
    toggleUserDropdown();
}

function openSettings() {
    showToast('Configurações em desenvolvimento.', 'info');
    toggleUserDropdown();
}

// ==================== //
// EVENT LISTENERS     //
// ==================== //

document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    checkAuthState();
    
    // Load featured projects
    loadFeaturedProjects();
    
    // Load stats
    loadStats();
    
    // Mobile menu toggle
    elements.mobileMenuBtn?.addEventListener('click', () => {
        elements.mobileMenu.classList.toggle('active');
    });
    
    // Auth modal close
    document.getElementById('closeAuthModal')?.addEventListener('click', closeAuthModal);
    document.getElementById('closeReportModal')?.addEventListener('click', closeReportModal);
    document.getElementById('closeProjectModal')?.addEventListener('click', closeProjectModal);
    
    // Close modals on backdrop click
    elements.authModal?.addEventListener('click', (e) => {
        if (e.target === elements.authModal) closeAuthModal();
    });
    elements.reportModal?.addEventListener('click', (e) => {
        if (e.target === elements.reportModal) closeReportModal();
    });
    elements.projectModal?.addEventListener('click', (e) => {
        if (e.target === elements.projectModal) closeProjectModal();
    });
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });
    
    // Login form
    elements.loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });
    
    // Register form
    elements.registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;
        
        if (password !== confirm) {
            showAuthMessage('As senhas não coincidem.', 'error');
            return;
        }
        
        register(email, password, username);
    });
    
    // Report form
    elements.reportForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const projectId = elements.reportProjectId.value;
        const reason = document.getElementById('reportReason').value;
        const description = document.getElementById('reportDescription').value;
        submitReport(projectId, reason, description);
    });
    
    // Load more projects
    elements.loadMoreProjects?.addEventListener('click', () => loadFeaturedProjects(false));
    
    // Create buttons
    elements.createProjectBtn?.addEventListener('click', createNewProject);
    elements.newProjectBtn?.addEventListener('click', createNewProject);
    elements.uploadProjectBtn?.addEventListener('click', openUploadDialog);
    
    // File input
    elements.fileUploadInput?.addEventListener('change', handleFileUpload);
    
    // Search
    elements.searchMyProjects?.addEventListener('input', (e) => {
        searchUserProjects(e.target.value);
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab)?.classList.add('active');
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            target?.scrollIntoView({ behavior: 'smooth' });
            elements.mobileMenu.classList.remove('active');
        });
    });
});

async function loadStats() {
    if (!supabase) return;
    
    try {
        const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);
        
        const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        if (elements.totalProjects) elements.totalProjects.textContent = projectCount || '0';
        if (elements.totalUsers) elements.totalUsers.textContent = userCount || '0';
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Make functions globally available
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.closeReportModal = closeReportModal;
window.closeProjectModal = closeProjectModal;
window.openReportModal = openReportModal;
window.openProjectModal = openProjectModal;
window.toggleFavorite = toggleFavorite;
window.scrollToMyStuff = scrollToMyStuff;
window.logout = logout;
window.createNewProject = createNewProject;
window.toggleUserDropdown = toggleUserDropdown;
window.openProfile = openProfile;
window.openSettings = openSettings;