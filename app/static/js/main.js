// Bloco 1: Inicialização e Declaração de Constantes Globais
window.onload = function() {
    console.log(">>> NEXUS SOLVER - System Init <<<");

    const getEl = (id) => document.getElementById(id);
    const body = document.body;
    
    // NOVO: Adiciona uma constante para o breakpoint grande
    const LARGE_SCREEN_BREAKPOINT = 1200; 
    const MOBILE_BREAKPOINT = 900;
    
    const mf = getEl('math-editor');
    const resultMf = getEl('result-output');
    const resultCard = getEl('result-area');
    
    // Container do Gráfico (DIV do Plotly)
    const plotContainer = getEl('plot-container');
    const plotlyDivId = 'plotly-graph'; 
    
    // Configuração Plotly 
    const config = {}; 

    const calculateBtn = getEl('calculate-btn');
    const clearBtn = getEl('clear-btn');
    const saveVarBtn = getEl('save-var-btn'); 
    
    const latexInput = getEl('latex-code');
    const excelInput = getEl('excel-code'); 
    const calcLabelInput = getEl('calc-label');
    
    const historyList = getEl('history-list');
    const variablesList = getEl('variables-list');
    const addVariableBtn = getEl('add-variable-btn');
    
    // Elementos das Abas (Handles) 
    const tabControlsContainer = getEl('tab-controls-container');
    const toolbarHandle = getEl('toolbar-main'); 
    const formulaHandle = getEl('formula-container');
    
    // Elementos do Conteúdo (Panes) 
    const toolbarContentArea = getEl('toolbar-content-area');
    const formulaContentArea = getEl('formula-content-area');
    
    // Elementos da Sidebar (Histórico - Direita)
    const sidebar = getEl('app-sidebar');
    const sidebarToggle = getEl('sidebar-toggle');
    
    // Elementos NEXUS (novo sidebar esquerdo)
    const nexusSidebar = getEl('app-nexus');
    const nexusToggle = getEl('nexus-toggle');

    // Elementos da Library (Antigo Memorial, agora fixo no topo)
    const libraryContainer = getEl('app-library');
    // const memorialToggle - REMOVIDO
    // const memorialRecolher - REMOVIDO
    
    // NOVO: Adiciona o botão Limpar Histórico para ser excluído na lógica de clique fora
    const clearHistBtn = getEl('clear-history-btn');
    
    // NOVO: Adiciona a referência do container principal
    const mainContent = document.querySelector('.main-content');
    
    // CRÍTICO: Força a rolagem para o topo na inicialização para garantir a visibilidade do cabeçalho
    if (mainContent) {
        setTimeout(() => {
            mainContent.scrollTop = 0;
        }, 50); // Delay para garantir que o layout final tenha sido renderizado
    }

// Ensure .formula-item overlays exist and math-field internals are non-focusable
function ensureFormulaOverlaysGlobal() {
    document.querySelectorAll('.formula-item').forEach(item => {
        const mfChild = item.querySelector('math-field');
        if (mfChild) {
            try { mfChild.setAttribute('tabindex', '-1'); } catch (e) {}
            try { mfChild.setAttribute('aria-hidden', 'true'); } catch (e) {}
            try { mfChild.style.pointerEvents = 'none'; } catch (e) {}
        }

        if (!item.querySelector('.formula-overlay')) {
            const ov = document.createElement('div');
            ov.className = 'formula-overlay';
            item.appendChild(ov);
        }
    });
}

    

// ===============================================================================================//
// ===============================================================================================//    
// Bloco 2: Lógica de Botões de Cálculo (HTML States)
    const CALCULATE_NORMAL_HTML = `<span class="material-icons-round calculate-icon">calculate</span> Calcular`;
    const CALCULATE_LOADING_HTML = `<span class="material-icons-round loading-icon">autorenew</span> Calculando...`;

    // Garante que o botão esteja no estado NORMAL no início
    if (calculateBtn) {
        calculateBtn.innerHTML = CALCULATE_NORMAL_HTML;
        calculateBtn.classList.remove('loading');
    }



// ===============================================================================================//
// ===============================================================================================//    
// Bloco 3: Lógica do Teclado Virtual (Toggle Keyboard)
const keyboardContainer = getEl('virtual-keyboard-container');
const keyboardToggleBtn = getEl('keyboard-toggle'); // Botão flutuante (ABRIR)

function _safeAddClass(el, cls){ if(el && !el.classList.contains(cls)) el.classList.add(cls); }
function _safeRemoveClass(el, cls){ if(el && el.classList.contains(cls)) el.classList.remove(cls); }

function toggleKeyboard(open) {
    try {
        if (!keyboardContainer || !keyboardToggleBtn || !mf) return;
        const wasOpen = keyboardContainer.classList.contains('open');
        const isOpen = open !== undefined ? !!open : !wasOpen;

        // Idempotência: se estado já for o desejado, garante efeitos colaterais mínimos e retorna.
        if (isOpen === wasOpen) {
            // porém, garante que o botão esteja com visibilidade coerente
            if (isOpen) _safeAddClass(keyboardToggleBtn, 'hidden');
            else _safeRemoveClass(keyboardToggleBtn, 'hidden');
            return;
        }

        if (isOpen) {
            // Abrindo teclado
            _safeAddClass(keyboardToggleBtn, 'hidden'); // ESCONDE o botão flutuante do teclado
            // Em mobile apenas: oculta toggles laterais para foco
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                if (sidebarToggle) _safeAddClass(sidebarToggle, 'hidden');
                if (nexusToggle) _safeAddClass(nexusToggle, 'hidden');
            }
            // Em mobile: fecha ambas as gavetas para dar prioridade ao teclado
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                try {
                    if (sidebar && sidebar.classList.contains('open')) {
                        sidebar.classList.remove('open');
                        _safeRemoveClass(document.body, 'sidebar-visible');
                    }
                } catch(e) { /* ignore */ }
                try {
                    if (nexusSidebar && nexusSidebar.classList.contains('open')) {
                        nexusSidebar.classList.remove('open');
                        _safeRemoveClass(document.body, 'nexus-visible');
                    }
                } catch(e) { /* ignore */ }
            }
            // Abre o teclado virtual pelo MathLive
            try { mf.executeCommand && mf.executeCommand('showVirtualKeyboard'); } catch(e){ /* ignore */ }
            _safeAddClass(keyboardContainer, 'open');
            _safeAddClass(body, 'keyboard-open');

            // Força foco com pequeno delay para evitar conflitos de render
            setTimeout(() => { try { mf.focus(); } catch(e){} }, 80);

            // Ajuste de padding/scroll para evitar sobreposição do teclado
            setTimeout(() => {
                try {
                    const kbRect = keyboardContainer.getBoundingClientRect();
                    const kbHeight = (kbRect && kbRect.height) ? kbRect.height : 400;
                    const main = document.querySelector('.main-content');
                    const unified = document.querySelector('.unified-input-wrapper');
                    if (main) main.style.paddingBottom = (kbHeight + 120) + 'px';
                    if (unified) {
                        const uRect = unified.getBoundingClientRect();
                        const overlap = (uRect.bottom) - (window.innerHeight - kbHeight);
                        if (overlap > 0) window.scrollBy({ top: overlap + 12, behavior: 'smooth' });
                    }
                } catch (e) { console.warn('keyboard layout adjust failed', e); }
            }, 120);

        } else {
            // Fechando teclado
            try { mf.executeCommand && mf.executeCommand('hideVirtualKeyboard'); } catch(e){ /* ignore */ }
            _safeRemoveClass(keyboardContainer, 'open');

            // Pequeno timeout para evitar problemas de foco/bug no Mac
            setTimeout(() => { try { _safeRemoveClass(keyboardToggleBtn, 'hidden'); } catch(e){} }, 100);

            // Em mobile: reabilita toggles somente se o breakpoint permitir e se respectivas sidebars não estiverem abertas
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                if (sidebar && !sidebar.classList.contains('open')) _safeRemoveClass(sidebarToggle, 'hidden');
                if (nexusSidebar && !nexusSidebar.classList.contains('open') && nexusToggle) _safeRemoveClass(nexusToggle, 'hidden');
            }

            _safeRemoveClass(body, 'keyboard-open');

            // Reset paddingBottom adicionado ao abrir teclado
            try { const main = document.querySelector('.main-content'); if (main) main.style.paddingBottom = ''; } catch(e){}
        }
    } catch (err) {
        console.error('toggleKeyboard error', err);
    }
}

if (keyboardToggleBtn) {
    keyboardToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Sempre forçar abertura ao clicar (conforme UX definido)
        toggleKeyboard(true);
    });
    // Garantir visibilidade inicial coerente (applyResponsiveVisibility controla a visibilidade definitiva)
    _safeRemoveClass(keyboardToggleBtn, 'hidden');
}




// Bloco 4: Lógica de Alternância Principal (Master Tabs)
    const panelTitle = document.querySelector('.app-header h1'); 
    
    function toggleMainContent(showFormulas) {
        // Esconde o teclado virtual
        toggleKeyboard(false); 
        
        if (showFormulas) {
            // Ativa Fórmulas
            formulaHandle.classList.add('active');
            formulaHandle.classList.remove('inactive');
            toolbarHandle.classList.add('inactive');
            toolbarHandle.classList.remove('active');
            
            formulaContentArea.classList.add('active');
            formulaContentArea.classList.remove('inactive');
            toolbarContentArea.classList.add('inactive');
            toolbarContentArea.classList.remove('active');

            // CORREÇÃO: Título da Aba deve ser o Título principal
            panelTitle.textContent = "NEXUS Library | Fórmulas";
            
            // O botão do teclado permanece visível (se o teclado estiver fechado)
            if (!keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden');

            // Mostrar/ocultar navs de categoria conforme a aba ativa
            try {
                const toolbarNav = document.querySelector('#toolbar-content-area .category-nav');
                const formulaNav = document.querySelector('#formula-content-area .category-nav');
                if (formulaNav) formulaNav.style.display = 'flex';
                if (toolbarNav) toolbarNav.style.display = 'none';
            } catch(e) { /* ignore */ }
            // CRÍTICO: Ativa o primeiro painel e botão de categoria de Fórmulas após a ativação da aba principal
            try {
                const nav = document.querySelector('#formula-content-area .category-nav');
                if (nav) {
                    const firstBtn = nav.querySelector('.cat-btn:first-child');
                    if (firstBtn) firstBtn.click(); // Simula o clique para ativar o painel
                    // Ensure overlays are present after panes activate
                    setTimeout(ensureFormulaOverlaysGlobal, 80);
                }
            } catch(e) { /* ignore */ }
            
        } else {
            // Ativa Funções
            formulaHandle.classList.remove('active');
            formulaHandle.classList.add('inactive');
            toolbarHandle.classList.remove('inactive');
            toolbarHandle.classList.add('active');

            formulaContentArea.classList.remove('active');
            formulaContentArea.classList.add('inactive');
            toolbarContentArea.classList.remove('inactive');
            toolbarContentArea.classList.add('active');

            panelTitle.textContent = "NEXUS Solver | Funções";
            
            // Mostra o botão do teclado
            if (!keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden'); 
            mf.focus();

            // Mostrar/ocultar navs de categoria conforme a aba ativa
            try {
                const toolbarNav = document.querySelector('#toolbar-content-area .category-nav');
                const formulaNav = document.querySelector('#formula-content-area .category-nav');
                if (toolbarNav) toolbarNav.style.display = 'flex';
                if (formulaNav) formulaNav.style.display = 'none';
            } catch(e) { /* ignore */ }
            // Garantir que nenhum painel de fórmula permaneça marcado como ativo
            try {
                document.querySelectorAll('.formula-pane.active').forEach(p => p.classList.remove('active'));
            } catch(e) { /* ignore */ }
            // Força remoção de qualquer painel de fórmulas ativo (garante ocultação completa)
            try {
                document.querySelectorAll('#formula-content-area .formula-pane').forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });
            } catch(e) { /* ignore */ }
            // Também garante que os botões de categoria das fórmulas não permaneçam visualmente ativos
            try {
                document.querySelectorAll('#formula-content-area .cat-btn.active').forEach(b => b.classList.remove('active'));
            } catch(e) { /* ignore */ }
        }
        
        // CRÍTICO: Após a troca de aba e foco, force o scroll para o topo
        if (mainContent) {
             mainContent.scrollTop = 0;
        }
    }


    // 2. Listeners para os Handles e Botões Internos
    if (toolbarHandle) {
        // Aba Funções
        toolbarHandle.addEventListener('click', () => { 
            // Clicar em aba ATIVA não faz nada
            if (toolbarHandle.classList.contains('inactive')) {
                toggleMainContent(false); 
            }
        });
    }
    if (formulaHandle) {
        // Aba Fórmulas
        formulaHandle.addEventListener('click', () => { 
            // Clicar em aba ATIVA não faz nada
            if (formulaHandle.classList.contains('inactive')) {
                toggleMainContent(true); 
            }
        });
    }
    
    // (Inicialização da aba principal será feita após construir as navs de categoria)

    // --- Build horizontal category nav (level-2 titles) for toolbar (Funções) and formulas ---
    function setupCategoryNavFor(contentRootSelector, sectionTitleSelector) {
        const container = document.querySelector(contentRootSelector);
        if (!container) return;

        // The content area may wrap inner content in a .toolbar-content or .formula-content-details
        const inner = container.querySelector('.toolbar-content') || container.querySelector('.formula-content-details') || container;
        if (!inner) return;

        const titles = Array.from(inner.querySelectorAll(sectionTitleSelector));
        if (titles.length === 0) return;

        const nav = document.createElement('div');
        nav.className = 'category-nav';

        // CORREÇÃO CRÍTICA: Os painéis são agora referenciados pelo seu ID
        const panes = [];
        // decide expected pane class based on content root
        const expectedPaneClass = contentRootSelector.includes('formula') ? 'formula-pane' : 'toolbar-pane';

        titles.forEach((title, idx) => {
            let pane = title.nextElementSibling;
            
            // Se next sibling é um divisor, ignoramos e removemos, e pegamos o próximo elemento que deve ser o painel
            if (pane && pane.classList.contains('divider')) {
                const toRemove = pane;
                pane = pane.nextElementSibling;
                try { toRemove.parentNode.removeChild(toRemove); } catch(e){}
            }
            
            // Garante que é um painel válido antes de prosseguir
            if (!pane || !pane.classList.contains(expectedPaneClass)) return;
            
            // Garante que o painel tem ID para referência
            if (!pane.id) {
                pane.id = `temp-pane-${idx}`;
            }
            panes.push(pane);

            // Hide original title
            title.style.display = 'none';

            const btn = document.createElement('button');
            btn.className = 'cat-btn';
            btn.type = 'button';
            btn.textContent = title.textContent.trim();
            btn.dataset.paneId = pane.id; // Salva o ID do painel no botão
            
            // Adiciona listener para controle de visibilidade
            btn.addEventListener('click', () => {
                // Desativa todos os botões e painéis
                nav.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                
                // Oculta todos os painéis removendo a classe CSS 'active'
                panes.forEach(p => p.classList.remove('active')); 
                
                // Ativa o botão e o painel correspondente
                btn.classList.add('active');
                // CRÍTICO: Adiciona a classe 'active' para que o CSS (display: flex) seja aplicado
                pane.classList.add('active');
            });

            nav.appendChild(btn);
        });

        // Insere nav antes do primeiro título, se houver painéis válidos
        if (titles.length > 0) {
            const firstTitle = titles[0];
            // CORREÇÃO CRÍTICA: Insere a navegação ANTES do primeiro título encontrado,
            // garantindo que ela fique dentro do container interno (`.toolbar-content` ou `.formula-content-details`).
            // Isso respeita o escopo e é o método mais seguro de inserção no DOM.
            firstTitle.parentNode.insertBefore(nav, firstTitle); 
        }

        // Ativa o primeiro painel por padrão e garante que todos os outros estejam ocultos
        panes.forEach((p, i) => {
            if (i === 0) {
                // O primeiro painel já deve ter 'active' no HTML para carregamento inicial (agora adicionamos aqui, caso falhe no HTML)
                p.classList.add('active'); 
            } else {
                // Remove a classe 'active' dos demais para que o CSS (display: none) funcione
                p.classList.remove('active');
            }
        });
        
        const firstBtn = nav.querySelector('.cat-btn');
        if (firstBtn) firstBtn.classList.add('active'); // Ativa visualmente o primeiro botão

    }

    // Setup for functions and formulas
    setupCategoryNavFor('#toolbar-content-area', '.toolbar-section-title');
    setupCategoryNavFor('#formula-content-area', '.toolbar-section-title');

    // Ajusta a largura de cada grupo com base no número de botões
    function adjustToolbarGroupWidths() {
        // botão base tamanho (px) - corresponde ao CSS: flex basis 56px / 48px for formulas
        const defaultBtnSize = 50; // AJUSTADO para 50px
        const formulaBtnSize = 48;
        const defaultGap = 8;

        const processGroup = (group, isFormula) => {
            const allBtns = Array.from(group.querySelectorAll('.toolbar-btn'));
            // ignore hidden placeholders
            const visibleBtns = allBtns.filter(b => !(b.style && b.style.visibility === 'hidden'));
            const n = visibleBtns.length;
            if (n === 0) {
                group.style.width = 'auto';
                group.style.height = 'auto';
                group.style.flex = '0 0 auto';
                return;
            }

            const btnSize = isFormula ? formulaBtnSize : defaultBtnSize;
            // columns = ceil(n/2) ensures first row gets ceil(n/2)
            const columns = Math.ceil(n / 2);
            const gap = defaultGap; // gap between buttons
            const widthPx = columns * btnSize + (columns - 1) * gap;
            // height for two rows (btn height + gap + btn height)
            const heightPx = (btnSize * 2) + gap;

            // Use CSS Grid per-group to reliably force exact two-line layout
            group.style.width = widthPx + 'px';
            group.style.height = heightPx + 'px';
            group.style.flex = '0 0 auto';
            group.style.display = 'grid';
            group.style.gridTemplateColumns = `repeat(${columns}, ${btnSize}px)`;
            group.style.gridAutoRows = `${btnSize}px`;
            group.style.columnGap = gap + 'px';
            group.style.rowGap = gap + 'px';
            group.style.alignItems = 'start';
        };

        // toolbar groups in both toolbar and formula areas
        document.querySelectorAll('#toolbar-content-area .toolbar-group').forEach(g => processGroup(g, false));
        document.querySelectorAll('#formula-content-area .toolbar-group').forEach(g => processGroup(g, true));
    }

    // Run initially and on resize (debounced)
    adjustToolbarGroupWidths();
    let resizeTimer = null;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { adjustToolbarGroupWidths(); }, 120); });

    // Agora que as navs foram construídas e panes potencialmente realocados,
    // inicializamos o estado da aba principal para Funções e ajustamos a visibilidade das navs.
    try {
        // Inicialmente: Funções visível, Fórmulas oculto
        toggleMainContent(false);
        // Ensure overlays are present even when formulas hidden (pre-inject)
        try { ensureFormulaOverlaysGlobal(); } catch(e) {}
        const toolbarNav = document.querySelector('#toolbar-content-area .category-nav');
        const formulaNav = document.querySelector('#formula-content-area .category-nav');
        if (toolbarNav) toolbarNav.style.display = 'flex';
        if (formulaNav) formulaNav.style.display = 'none';
    } catch(e) { /* ignore */ }

  
    
// Bloco 5: Lógica de Toggles de Sidebar (Histórico e Memorial)
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Em desktop (large) não permitir toggle (sidebars fixas)
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) return;

        const willOpen = !sidebar.classList.contains('open');

        // Fecha outras gavetas ao abrir (comportamento overlay/mobile)
        if (willOpen) {
            // Fecha Nexus se estiver aberto (evita overlap)
            if (nexusSidebar && nexusSidebar.classList.contains('open')) {
                nexusSidebar.classList.remove('open');
                _safeRemoveClass(document.body, 'nexus-visible');
            }
            // Fecha teclado se estiver aberto
            toggleKeyboard(false);
        }

        // Toggle da sidebar
        sidebar.classList.toggle('open');
        sidebar.classList.remove('override-close');

        // Mobile specific: quando abrir Histórico, esconder o toggle NEXUS para evitar duplicação visual
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            if (sidebar.classList.contains('open')) {
                if (nexusToggle) _safeAddClass(nexusToggle, 'hidden');
            } else {
                if (nexusToggle && !(nexusSidebar && nexusSidebar.classList.contains('open'))) _safeRemoveClass(nexusToggle, 'hidden');
            }
        }

        // Atualiza classes no body para o CSS reagir
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            if (sidebar.classList.contains('open')) _safeAddClass(document.body, 'sidebar-visible');
            else _safeRemoveClass(document.body, 'sidebar-visible');
        } else {
            // mobile: body class removida para evitar conflito com overlay logic
            _safeRemoveClass(document.body, 'sidebar-visible');
        }
    });
}

if (nexusToggle && nexusSidebar) {
    nexusToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Em desktop (large) não permitir toggle - as colunas permanecem fixas
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) return;

        const willOpen = !nexusSidebar.classList.contains('open');

        // Fecha a outra gaveta quando abrir (evita overlap)
        if (willOpen) {
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                _safeRemoveClass(document.body, 'sidebar-visible');
            }
            // Fecha teclado se estiver aberto
            toggleKeyboard(false);
        }

        nexusSidebar.classList.toggle('open');
        nexusSidebar.classList.remove('override-close');

        // Mobile: esconde toggle Histórico quando Nexus abrir como overlay
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            if (nexusSidebar.classList.contains('open')) {
                if (sidebarToggle) _safeAddClass(sidebarToggle, 'hidden');
            } else {
                if (sidebarToggle && !(sidebar && sidebar.classList.contains('open'))) _safeRemoveClass(sidebarToggle, 'hidden');
            }
        }

        // Atualiza body class para comportamento não-overlay em tamanhos médios (tablet scenario)
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) {
            document.body.classList.toggle('nexus-visible', nexusSidebar.classList.contains('open'));
        } else {
            _safeRemoveClass(document.body, 'nexus-visible');
        }
    });
}

  
    
// Bloco 5: Lógica de Toggles de Sidebar (Histórico e Memorial)
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Em desktop (large) não permitir toggle (sidebars fixas)
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) return;

        const willOpen = !sidebar.classList.contains('open');

        // Fecha outras gavetas ao abrir (comportamento overlay/mobile)
        if (willOpen) {
            // Fecha Nexus se estiver aberto (evita overlap)
            if (nexusSidebar && nexusSidebar.classList.contains('open')) {
                nexusSidebar.classList.remove('open');
                _safeRemoveClass(document.body, 'nexus-visible');
            }
            // Fecha teclado se estiver aberto
            toggleKeyboard(false);
        }

        // Toggle da sidebar
        sidebar.classList.toggle('open');
        sidebar.classList.remove('override-close');

        // Mobile specific: quando abrir Histórico, esconder o toggle NEXUS para evitar duplicação visual
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            if (sidebar.classList.contains('open')) {
                if (nexusToggle) _safeAddClass(nexusToggle, 'hidden');
            } else {
                if (nexusToggle && !(nexusSidebar && nexusSidebar.classList.contains('open'))) _safeRemoveClass(nexusToggle, 'hidden');
            }
        }

        // Atualiza classes no body para o CSS reagir
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            if (sidebar.classList.contains('open')) _safeAddClass(document.body, 'sidebar-visible');
            else _safeRemoveClass(document.body, 'sidebar-visible');
        } else {
            // mobile: body class removida para evitar conflito com overlay logic
            _safeRemoveClass(document.body, 'sidebar-visible');
        }
    });
}

if (nexusToggle && nexusSidebar) {
    nexusToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Em desktop (large) não permitir toggle - as colunas permanecem fixas
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) return;

        const willOpen = !nexusSidebar.classList.contains('open');

        // Fecha a outra gaveta quando abrir (evita overlap)
        if (willOpen) {
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                _safeRemoveClass(document.body, 'sidebar-visible');
            }
            // Fecha teclado se estiver aberto
            toggleKeyboard(false);
        }

        nexusSidebar.classList.toggle('open');
        nexusSidebar.classList.remove('override-close');

        // Mobile: esconde toggle Histórico quando Nexus abrir como overlay
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            if (nexusSidebar.classList.contains('open')) {
                if (sidebarToggle) _safeAddClass(sidebarToggle, 'hidden');
            } else {
                if (sidebarToggle && !(sidebar && sidebar.classList.contains('open'))) _safeRemoveClass(sidebarToggle, 'hidden');
            }
        }

        // Atualiza body class para comportamento não-overlay em tamanhos médios (tablet scenario)
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) {
            document.body.classList.toggle('nexus-visible', nexusSidebar.classList.contains('open'));
        } else {
            _safeRemoveClass(document.body, 'nexus-visible');
        }
    });
}

  

// ===============================================================================================//
// ===============================================================================================//   
// Bloco 5: Lógica de Toggles de Sidebar (Histórico e Memorial)
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Em desktop (large) não permitir toggle (sidebars fixas)
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) return;

        const willOpen = !sidebar.classList.contains('open');

        // Fecha outras gavetas ao abrir (comportamento overlay/mobile)
        if (willOpen) {
            // Fecha Nexus se estiver aberto (evita overlap)
            if (nexusSidebar && nexusSidebar.classList.contains('open')) {
                nexusSidebar.classList.remove('open');
                _safeRemoveClass(document.body, 'nexus-visible');
            }
            // Fecha teclado se estiver aberto
            toggleKeyboard(false);
        }

        // Toggle da sidebar
        sidebar.classList.toggle('open');
        sidebar.classList.remove('override-close');

        // Mobile specific: quando abrir Histórico, esconder o toggle NEXUS para evitar duplicação visual
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            if (sidebar.classList.contains('open')) {
                if (nexusToggle) _safeAddClass(nexusToggle, 'hidden');
            } else {
                if (nexusToggle && !(nexusSidebar && nexusSidebar.classList.contains('open'))) _safeRemoveClass(nexusToggle, 'hidden');
            }
        }

        // Atualiza classes no body para o CSS reagir
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            if (sidebar.classList.contains('open')) _safeAddClass(document.body, 'sidebar-visible');
            else _safeRemoveClass(document.body, 'sidebar-visible');
        } else {
            // mobile: body class removida para evitar conflito com overlay logic
            _safeRemoveClass(document.body, 'sidebar-visible');
        }
    });
}

if (nexusToggle && nexusSidebar) {
    nexusToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        // Em desktop (large) não permitir toggle - as colunas permanecem fixas
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) return;

        const willOpen = !nexusSidebar.classList.contains('open');

        // Fecha a outra gaveta quando abrir (evita overlap)
        if (willOpen) {
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                _safeRemoveClass(document.body, 'sidebar-visible');
            }
            // Fecha teclado se estiver aberto
            toggleKeyboard(false);
        }

        nexusSidebar.classList.toggle('open');
        nexusSidebar.classList.remove('override-close');

        // Mobile: esconde toggle Histórico quando Nexus abrir como overlay
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            if (nexusSidebar.classList.contains('open')) {
                if (sidebarToggle) _safeAddClass(sidebarToggle, 'hidden');
            } else {
                if (sidebarToggle && !(sidebar && sidebar.classList.contains('open'))) _safeRemoveClass(sidebarToggle, 'hidden');
            }
        }

        // Atualiza body class para comportamento não-overlay em tamanhos médios (tablet scenario)
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) {
            document.body.classList.toggle('nexus-visible', nexusSidebar.classList.contains('open'));
        } else {
            _safeRemoveClass(document.body, 'nexus-visible');
        }
    });
}



// ===============================================================================================//
// ============================================================================================//
// Bloco 6: Lógica de Fechamento por Clique Externo
    // --- FECHAR TECLADO, SIDEBAR E GERENCIAR CLIQUES NO STACKED PANEL POR CLIQUE FORA ---
    document.addEventListener('click', (e) => {
        // CRÍTICO: Se a tela for LARGUE (> 1200px), as sidebars são FIXAS.
        // O clique externo DEVE ser ignorado para evitar que as sidebars "pulem".
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) {
             // A única exceção é o teclado virtual, que ainda pode ser fechado por clique externo
             if (keyboardContainer && keyboardContainer.classList.contains('open')) {
                 const isClickInsideKeyboard = keyboardContainer && keyboardContainer.contains(e.target);
                 const isClickOnEditor = (e.composedPath && typeof e.composedPath === 'function' && e.composedPath().includes(mf));
                 const isClickOnKeyboardToggle = keyboardToggleBtn && keyboardToggleBtn.contains(e.target);
                 const isClickOnVariablePanel = variablesList && variablesList.contains(e.target);

                 if (!isClickInsideKeyboard && !isClickOnEditor && !isClickOnKeyboardToggle && !isClickOnVariablePanel) {
                     toggleKeyboard(false);
                 }
             }
            return; // Sai da função para ignorar o fechamento das sidebars
        }

        const isClickOnSidebarToggle = sidebarToggle && sidebarToggle.contains(e.target);
        // isClickOnMemorialToggle REMOVIDO
        const isClickOnNexusToggle = nexusToggle && nexusToggle.contains(e.target);
        // isClickOnMemorialRecolher REMOVIDO
        const isClickOnKeyboardToggle = keyboardToggleBtn && keyboardToggleBtn.contains(e.target);
        // NOVO: Verifica se o clique foi no botão Limpar Histórico
        const isClickOnClearHistBtn = clearHistBtn && clearHistBtn.contains(e.target);
        
        // Detecta se o clique foi dentro do container do teclado
        const isClickInsideKeyboard = keyboardContainer && keyboardContainer.contains(e.target);

        // --- Variáveis de verificação de foco ---
        const isClickOnEditor = (function(){
            try {
                if (!mf) return false;
                if (mf.contains && mf.contains(e.target)) return true;
                if (e.composedPath && typeof e.composedPath === 'function' && e.composedPath().includes(mf)) return true;
                if (document.activeElement === mf) return true;
                if (document.activeElement && document.activeElement.tagName && document.activeElement.tagName.toLowerCase() === 'math-field') return true;
            } catch(err) { }
            return false;
        })();
        const isClickOnVariablePanel = variablesList && variablesList.contains(e.target);
        
        // --- 1. Lógica para fechar a Sidebar (Histórico) ---
        if (sidebar && sidebar.classList.contains('open')) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            
            // CRÍTICO: Não fechar se o clique for nos toggles, nem no botão Limpar (que está no sidebar)
            // isClickOnMemorialToggle REMOVIDO
            if (!isClickInsideSidebar && !isClickOnSidebarToggle && !isClickOnClearHistBtn) { 
                sidebar.classList.remove('open');
                // Adicionado: Remove explicitamente a classe de visibilidade
                document.body.classList.remove('sidebar-visible');
                
                // Reabilita os botões de toggle se o Histórico fechar e NADA mais estiver aberto
                if (window.innerWidth <= MOBILE_BREAKPOINT && !keyboardContainer.classList.contains('open') && !nexusSidebar.classList.contains('open')) {
                    keyboardToggleBtn.classList.remove('hidden');
                    // Certifica-se de que o NEXUS toggle reaparece se ele não estiver aberto
                    if (nexusToggle && !nexusSidebar.classList.contains('open')) nexusToggle.classList.remove('hidden');
                }
            }
        }
        
        // --- 1B. Lógica para fechar a Sidebar (Memorial) ---
        // MEMORIAL FOI REMOVIDO E TRANSFORMADO EM PAINEL FIXO (#app-library)

        // --- 1C. Lógica para fechar a Sidebar (NEXUS esquerdo) ---
        if (nexusSidebar && nexusSidebar.classList.contains('open')) {
            const isClickInsideNexus = nexusSidebar.contains(e.target);
            if (!isClickInsideNexus && !isClickOnNexusToggle && !isClickOnKeyboardToggle && !isClickOnEditor) {
                nexusSidebar.classList.remove('open');
                // Adicionado: Remove explicitamente a classe de visibilidade
                document.body.classList.remove('nexus-visible');
                
                if (window.innerWidth <= MOBILE_BREAKPOINT) {
                    // Re-enable other toggles if needed
                    // Apenas reabilita se o Histórico e o Teclado não estiverem abertos
                    if (!sidebar.classList.contains('open') && !keyboardContainer.classList.contains('open')) {
                         sidebarToggle.classList.remove('hidden');
                         keyboardToggleBtn.classList.remove('hidden');
                    }
                }
            }
        }

        // --- 2. Lógica para fechar o Teclado ---
        if (keyboardContainer && keyboardContainer.classList.contains('open')) {
            
            // CRÍTICO: O teclado só fecha se o clique NÃO estiver em NENHUMA das áreas de edição ou toggle.
            if (!isClickInsideKeyboard && !isClickOnEditor && !isClickOnKeyboardToggle && !isClickOnVariablePanel) {
                toggleKeyboard(false);
            }
        }
    });



// ===============================================================================================//
// ===============================================================================================//
// Bloco 7: Funções Auxiliares (Limpeza e Formato Excel)
    // --- FUNÇÕES AUXILIARES ---
    function cleanMathString(str) {
        if (!str) return "";
        let clean = str.replace(/["']/g, ""); 
        clean = clean.replace(/\u00A0/g, " "); 
        clean = clean.replace(/\\;/g, " "); 
        clean = clean.replace(/\\:/g, " "); 
        return clean;
    }

    function getExcelFormat(expr) {
        if (!expr) return "";
        let cleanExpr = expr.replace(/[""]/g, "").replace(/\u00A0/g, " "); 
        cleanExpr = cleanExpr.replace(/\\;/g, " ").replace(/\\:/g, " "); 
        
        const lower = cleanExpr.toLowerCase();
        const invalidPatterns = ['int', '∫', 'integral', 'diff', 'd/d', 'partial', '∂', 'lim', 'limit', 'sum', '∑', '='];
        for (let pattern of invalidPatterns) {
            if (lower.includes(pattern)) return "⚠️ N/A (Cálculo Simbólico)";
        }
        return "=" + cleanExpr.replace(/\^/g, "^"); 
    }



// ===============================================================================================//
// ===============================================================================================//
// Bloco 8: Atualização do Painel Técnico (LaTeX/Excel)
    // CORREÇÃO: Limpamos o código LaTeX para evitar \textasciicircum2
    function updateTechPane() {
        if (!mf) return;
        // Pega o valor em LaTeX
        let currentLatex = mf.getValue("latex");
        // Remove a conversão ASCII indesejada (\textasciicircum) que aparece no modo de edição que não renderiza
        let cleanLatex = currentLatex.replace(/\\textasciicircum/g, '^');
        cleanLatex = cleanLatex.replace(/\\;/g, " "); 
        cleanLatex = cleanLatex.replace(/\s{2,}/g, " "); 
        if (latexInput) latexInput.value = cleanLatex;
        
        // Pega o valor em ASCII-math para o Excel
        let currentAscii = mf.getValue("ascii-math");
        if (excelInput) excelInput.value = getExcelFormat(currentAscii); 
    }
    
    // Garante que o painel técnico seja atualizado na inicialização
    updateTechPane();



// ===============================================================================================//
// ===============================================================================================//
// Bloco 9: Configuração e Eventos do MathLive
    // --- CONFIGURAÇÃO DO EDITOR MATHLIVE (USANDO SETOPTIONS ANTIGO, MAS FUNCIONAL) ---
    try {
        if (mf) {
            // CORREÇÃO CRÍTICA: Revertendo para setOptions (formato que funcionava) e configurando o virtualKeyboard
            mf.setOptions({ 
                smartMode: true, 
                virtualKeyboardMode: 'manual', 
                virtualKeyboardToolbar: 'none', 
                virtualKeyboardContainer: keyboardContainer, 
                keypressSound: null 
            });
            
            // Keep keyboard open while typing: ensure focus/keydown won't auto-close it
            mf.addEventListener('keydown', (e) => {
                // For space, insert a small spacing command and update technical pane.
                // IMPORTANT: Do NOT open the virtual keyboard here — keyboard must open only via the button.
                if (e.key === ' ') {
                    e.preventDefault();
                    mf.executeCommand('insert', '\\;');
                    setTimeout(updateTechPane, 10);
                    return;
                }
                if (e.key === 'Enter') { e.preventDefault(); performCalculation(); }
                // Do not modify keyboard open/close state on general key presses.
            });

            // When the math-field gains focus do not auto-open the virtual keyboard.
            mf.addEventListener('focus', () => {
                // keep behavior passive: only update pane
                setTimeout(updateTechPane, 10);
            });
            mf.addEventListener('blur', () => {
                // don't auto-close here; document click handles intentional closes
            });

            // CORREÇÃO CRÍTICA: Revertendo para o listener de 'input' simples que funcionava
            mf.addEventListener('input', updateTechPane); 
            
            calculateBtn.addEventListener('click', () => toggleKeyboard(false));
            
        }
    } catch (e) { console.error("Erro MathLive:", e); }
    // --- FIM CONFIGURAÇÃO MATHLIVE ---




// ===============================================================================================//
// ===============================================================================================//
// Bloco 10: Lógica de Histórico
    // --- HISTÓRICO ---
    let calculationHistory = JSON.parse(localStorage.getItem('engineer_v5_history') || '[]');
    function updateHistoryUI() {
        if (!historyList) return;
        historyList.innerHTML = '';
        if (calculationHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-state">Nenhum cálculo recente.</div>';
            return;
        }
        calculationHistory.slice().reverse().forEach((item, index) => {
            const realIndex = calculationHistory.length - 1 - index;
            const div = document.createElement('div');
            div.className = 'history-item';
            div.dataset.index = realIndex;
            const cleanLabel = item.label ? item.label.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; 
            const titleHtml = cleanLabel ? `<span style="color: var(--primary); font-weight: bold;">${cleanLabel}</span>` : `<span style="color: var(--text-muted);">Input: <math-field read-only style="font-size: 0.85em; display: inline;">${item.latex}</math-field></span>`;
            const displayPrefix = item.result.includes('=') ? '' : '= ';
            div.innerHTML = `
                <div class="history-header" style="font-size: 0.85em; margin-bottom: 4px;">${titleHtml}</div>
                <div class="history-result-group">
                    <math-field read-only class="history-result" style="font-weight: bold; font-size: 1.1em; max-width: 90%;">${displayPrefix}${item.result}</math-field>
                    <span class="material-icons-round delete-btn" data-index="${realIndex}" title="Excluir">delete_outline</span>
                </div>
                <div style="font-size: 0.75em; color: var(--text-muted); margin-top:4px;">Clique para inserir</div>
            `;
            historyList.appendChild(div);
        });
    }
    function addToHistory(inputLatex, resultLatex, label) { 
        calculationHistory.push({ latex: inputLatex, result: resultLatex, label: label });
        if (calculationHistory.length > 20) calculationHistory.shift();
        localStorage.setItem('engineer_v5_history', JSON.stringify(calculationHistory));
        updateHistoryUI();
    }
    if (historyList) {
        historyList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            const historyItem = e.target.closest('.history-item');
            if (deleteBtn) {
                const indexToDelete = parseInt(deleteBtn.dataset.index);
                // REMOVIDA A CONFIRMAÇÃO DO HISTÓRICO
                calculationHistory.splice(indexToDelete, 1);
                localStorage.setItem('engineer_v5_history', JSON.stringify(calculationHistory));
                updateHistoryUI();
                
                e.stopPropagation(); 
            } else if (historyItem) {
                const index = parseInt(historyItem.dataset.index);
                const item = calculationHistory[index];
                let valueToInsert = item.result.includes('=') ? item.result.split('=')[1].trim() : item.result;
                valueToInsert = valueToInsert.replace('+ C', '').trim();
                if (mf) { mf.executeCommand('insert', valueToInsert); mf.focus(); setTimeout(updateTechPane, 100); }
            }
        });
    }
    
    // O botão clearHistBtn está no cabeçalho
    if (clearHistBtn) clearHistBtn.addEventListener('click', () => { 
        if(confirm("Limpar todo o histórico?")) {
            calculationHistory = []; 
            localStorage.removeItem('engineer_v5_history'); 
            updateHistoryUI(); 
        }
    });
    updateHistoryUI();



// ===============================================================================================//
// ===============================================================================================//    
// Bloco 11: Lógica de Variáveis
    let variables = JSON.parse(localStorage.getItem('engineer_v5_variables') || '[]');
    if (variablesList) {
        function saveVariables() { localStorage.setItem('engineer_v5_variables', JSON.stringify(variables)); }
        function renderVariables() {
            variablesList.innerHTML = '';
            variables.forEach((v, index) => {
                const div = document.createElement('div');
                div.className = 'variable-item';
                if (v.origin) { div.setAttribute('title', `Fórmula original: ${v.origin}`); div.setAttribute('data-formula', 'true'); }
                let restoreButtonHtml = v.origin ? `<span class="material-icons-round restore-btn" data-index="${index}" title="Carregar fórmula">history</span>` : '';
                div.innerHTML = `
                    <span class="material-icons-round insert-var-btn" data-varname="${v.name}" data-varvalue="${v.value}" title="Inserir Nome no Editor">input</span>
                    
                    <input type="text" class="var-name" value="${v.name}" placeholder="Var" data-index="${index}">
                    
                    <math-field class="var-value-editor" 
                                data-index="${index}" 
                                placeholder="Valor" 
                                value="${v.value.replace(/\\/g, '\\\\')}" 
                                smart-mode
                                virtual-keyboard-mode="off" 
                                virtual-keyboard-toolbar="none"
                    ></math-field>
                    
                    <input type="text" class="var-unit" value="${v.unit}" placeholder="Unid." data-index="${index}">
                    ${restoreButtonHtml}
                    <span class="material-icons-round delete-btn" data-index="${index}" title="Excluir">close</span>
                `;
                variablesList.appendChild(div);
            });
            
            // Listener para o NOME e UNIDADE (ainda são inputs)
            variablesList.querySelectorAll('.var-name, .var-unit').forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = e.target.dataset.index;
                    const item = e.target.closest('.variable-item');
                    const insertBtn = item.querySelector('.insert-var-btn');
                    
                    if (e.target.className.includes('name')) {
                        variables[idx].name = e.target.value;
                        if (insertBtn) insertBtn.dataset.varname = e.target.value;
                    }
                    if (e.target.className.includes('unit')) variables[idx].unit = e.target.value;
                    saveVariables();
                });
            });
            
            // NOVO Listener para o VALOR (agora é math-field)
            variablesList.querySelectorAll('.var-value-editor').forEach(mfEl => {
                mfEl.addEventListener('input', (e) => {
                    const idx = e.target.dataset.index;
                    const item = e.target.closest('.variable-item');
                    const insertBtn = item.querySelector('.insert-var-btn');
                    
                    // Captura o valor em LaTeX/ASCII para salvar
                    const newValue = mfEl.getValue('latex'); 
                    variables[idx].value = newValue;
                    
                    // Atualiza o data-varvalue quando o valor muda (para o botão de inserção, se ele voltasse a inserir o valor)
                    if (insertBtn) insertBtn.dataset.varvalue = newValue;
                    
                    saveVariables();
                });
            });


            // Revertido: Listener insere o NOME da variável (varName)
            variablesList.querySelectorAll('.insert-var-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const varName = e.target.dataset.varname; 
                    
                    if (varName && mf) { 
                        mf.executeCommand('insert', varName.trim()); 
                        mf.focus(); 
                        setTimeout(updateTechPane, 10); 
                    }
                });
            });

            variablesList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    // REMOVIDA A CONFIRMAÇÃO DA VARIÁVEL
                    variables.splice(e.target.dataset.index, 1); 
                    renderVariables(); 
                    saveVariables(); 
                });
            });
            variablesList.querySelectorAll('.restore-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.target.dataset.index;
                    if (variables[idx].origin && mf) { mf.setValue(variables[idx].origin); mf.focus(); setTimeout(updateTechPane, 10); }
                });
            });
        }
        if (addVariableBtn) addVariableBtn.addEventListener('click', () => { variables.push({ name: '', value: '', unit: '' }); renderVariables(); saveVariables(); });
        renderVariables();
    }



// ===============================================================================================//
// ===============================================================================================//    
// Bloco 12: Função de Cálculo Principal (performCalculation)
    // --- 5. FUNÇÃO DE CÁLCULO (COM PLOTLY) ---
    async function performCalculation() {
        if (!mf) return;
        
        let rawExpression = mf.getValue("ascii-math"); 
        let expression = cleanMathString(rawExpression); 
        
        let latexVal = mf.getValue(); 
        let calcLabel = calcLabelInput ? calcLabelInput.value.trim() : ""; 
        
        updateTechPane(); 

        const variableMap = {};
        variables.forEach(v => { 
            const varName = v.name ? v.name.trim() : '';
            const varValue = v.value ? v.value.trim() : '';
            if (varName && varValue) variableMap[varName] = varValue; 
        });

        if (!expression) { alert("Digite uma expressão."); return; }

        if (calculateBtn) {
            calculateBtn.disabled = true;
            calculateBtn.classList.add('loading');
            calculateBtn.innerHTML = CALCULATE_LOADING_HTML; 
        }
        
        if (resultMf) resultMf.setValue("\\text{Calculando...}");
        if (resultCard) resultCard.classList.remove('hidden');
        
        if (plotContainer) plotContainer.style.display = 'none';
        
        // FECHA o teclado ao calcular
        toggleKeyboard(false); 

        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expression: expression, variables: variableMap })
            });
            const data = await response.json();

            if (response.ok) {
                if (resultMf) resultMf.setValue(data.result_latex);
                addToHistory(latexVal, data.result_latex, calcLabel);
                updateTechPane(); 

                // --- RENDERIZAÇÃO PLOTLY ---
                if (data.plot_data) {
                    if (plotContainer) {
                        plotContainer.style.display = 'flex';
                        
                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                        const gridColor = isDark ? '#374151' : '#e5e7eb';
                        const zeroColor = isDark ? '#9ca3af' : '#9ca3af';
                        const fontColor = isDark ? '#f9fafb' : '#1f2937';
                        const primaryColor = isDark ? '#0ea5e9' : '#3b82f6';
                        
                        const layout = {
                            margin: { t: 20, r: 20, b: 40, l: 50 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: { 
                                showgrid: true, gridcolor: gridColor, 
                                zeroline: true, zerolinecolor: zeroColor,
                                title: 'x',
                                tickfont: { color: fontColor },
                                titlefont: { color: fontColor }
                            },
                            yaxis: { 
                                showgrid: true, gridcolor: gridColor, 
                                zeroline: true, zerolinecolor: zeroColor,
                                title: 'f(x)',
                                tickfont: { color: fontColor },
                                titlefont: { color: fontColor }
                            },
                            font: { color: fontColor }, 
                            showlegend: true,
                            hovermode: 'closest'
                        };
                        
                        const trace = {
                            x: data.plot_data.x,
                            y: data.plot_data.y,
                            mode: 'lines',
                            line: { color: primaryColor, width: 3 },
                            name: 'f(x)',
                            type: 'scatter'
                        };

                        Plotly.newPlot(plotlyDivId, [trace], layout, config);
                        setTimeout(() => { plotContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
                    }
                } else {
                    if (plotContainer) plotContainer.style.display = 'none';
                }

            } else {
                if (resultMf) resultMf.setValue(data.error || "\\text{Erro}");
            }
        } catch (error) {
            console.error("Erro Fetch:", error);
            if (resultMf) resultMf.setValue("\\text{Erro de conexão}");
        } finally {
            if (calculateBtn) {
                calculateBtn.disabled = false;
                calculateBtn.classList.remove('loading');
                calculateBtn.innerHTML = CALCULATE_NORMAL_HTML; 
            }
            mf.focus(); 
        }
    }

    if (calculateBtn) calculateBtn.addEventListener('click', (e) => { e.preventDefault(); performCalculation(); });
    if (clearBtn) clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (mf) mf.setValue('');
        if (resultCard) resultCard.classList.add('hidden');
        if (calcLabelInput) calcLabelInput.value = '';
        updateTechPane();
        mf.focus();
        toggleKeyboard(false); // Fecha o teclado ao limpar
    });



// ===============================================================================================//
// ===============================================================================================//    
    // Bloco 13: Listener de Toggles de Tema e Toolbar
    // --- TOOLBAR CLICK ---
    const toolbar = document.querySelector('#toolbar-content-area .toolbar-content');
    if (toolbar) toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (btn && mf) {
            const latex = btn.dataset.latex;
            if (latex) { mf.executeCommand('insert', latex); mf.focus(); updateTechPane(); }
        }
    });

    // --- TEMA DARK/LIGHT (COM ATUALIZAÇÃO PLOTLY) ---
    const themeBtn = getEl('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        themeBtn.querySelector('span').textContent = next === 'light' ? 'dark_mode' : 'light_mode';
        
        const plotEl = getEl(plotlyDivId);
        if (plotEl && plotEl.data) {
            const isDark = next === 'dark';
            const gridColor = isDark ? '#374151' : '#e5e7eb';
            const zeroColor = isDark ? '#9ca3af' : '#9ca3af';
            const fontColor = isDark ? '#f9fafb' : '#1f2937';
            const primaryColor = isDark ? '#0ea5e9' : '#3b82f6';
            
            const layoutUpdate = {
                'xaxis.gridcolor': gridColor, 'yaxis.gridcolor': gridColor,
                'xaxis.zerolinecolor': zeroColor, 'yaxis.zerolinecolor': zeroColor,
                'font.color': fontColor,
                'xaxis.tickfont.color': fontColor, 'xaxis.titlefont.color': fontColor,
                'yaxis.tickfont.color': fontColor, 'yaxis.titlefont.color': fontColor,
            };
            
            Plotly.relayout(plotlyDivId, layoutUpdate);
             Plotly.restyle(plotlyDivId, 'line.color', [primaryColor]); 
        }
    });



// ===============================================================================================//
// ===============================================================================================// 
// Bloco 14: Lógica de Salvar Variável
    // --- SALVAR VARIÁVEL ---
    if (saveVarBtn) {
        saveVarBtn.addEventListener('click', () => {
            let rawLatex = resultMf.getValue(); 
            if (!rawLatex || rawLatex.includes("\\text{Calculando") || rawLatex.trim() === "") { alert("Calcule algo primeiro."); return; }
            let cleanStr = rawLatex.replace(/\\text\{.*?\}/g, '').trim();
            let varName = "", varValue = "";
            if (cleanStr.includes('=')) { const parts = cleanStr.split('='); varName = parts[0].trim(); varValue = parts[1].trim(); } 
            else { varValue = cleanStr; varName = calcLabelInput ? calcLabelInput.value.trim().split(' ')[0] : ""; }
            varValue = varValue.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').trim(); 
            varName = varName.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\s+/g, '_').trim(); 

            if (!varName) { varName = prompt("Nome da variável (ex: r):", "r"); if (!varName) return; }
            let originalFormula = mf.getValue("latex");
            const existingIndex = variables.findIndex(v => v.name === varName);
            const emptySlotIndex = variables.findIndex(v => v.name.trim() === "");
            const newVar = { name: varName, value: varValue, unit: '', origin: originalFormula };
            if (existingIndex >= 0) {
                if(confirm(`A variável "${varName}" já existe.\n\n[OK] Substituir.\n[Cancelar] Criar NOVA.`)) variables[existingIndex] = newVar;
                else { 
                    let newName = prompt("Nome NOVA variável:", varName + "_nova"); 
                    if(newName) { 
                        newVar.name = newName.replace(/\s+/g, '_'); 
                        variables.push(newVar); 
                    }
                }
            } else if (emptySlotIndex >= 0) variables[emptySlotIndex] = newVar;
            else variables.push(newVar);
            saveVariables(); renderVariables();
            const originalHtml = saveVarBtn.innerHTML; saveVarBtn.innerHTML = '<span class="material-icons-round">check</span> Salvo!';
            setTimeout(() => { saveVarBtn.innerHTML = originalHtml; }, 1500);
        });
    }



// ===============================================================================================//
// ===============================================================================================// 
// Bloco 15: Lógica de Visibilidade Responsiva (NOVO)
    function applyResponsiveVisibility() {
        const width = window.innerWidth;
        
        // allow function to run even if optional sidebars/toggles are missing
        if (!sidebar || !sidebarToggle) return;

        // --- 1. Desktop/Widescreen (Width > 1200px) ---
        if (width > LARGE_SCREEN_BREAKPOINT) {
            // Estado padrão: Histórico e NEXUS abertos. Toggles invisíveis.
            sidebar.classList.add('open');
            if (nexusSidebar) nexusSidebar.classList.add('open');
            
            // Remove a classe que impede a abertura forçada pelo CSS
            sidebar.classList.remove('override-close'); 
            
            // Esconde os toggles (o CSS fará o trabalho real)
            sidebarToggle.classList.add('toggle-hidden');
            if (nexusToggle) nexusToggle.classList.add('toggle-hidden');
            // Ensure body classes for large-screen visibility of both columns
            document.body.classList.add('nexus-visible');
            document.body.classList.add('sidebar-visible');
            
            // CRÍTICO: Garante que o botão flutuante esteja visível (a lógica do Teclado fará o hide/show)
            if (!keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden');


        // --- 2. Tablet/Tela Média (901px a 1200px) ---
        } else if (width > MOBILE_BREAKPOINT && width <= LARGE_SCREEN_BREAKPOINT) {
            // Estado padrão (Tablet/Médio): Histórico FIXO (coluna direita), NEXUS recolhida. Library é fixo.
            sidebar.classList.add('open');
            if (nexusSidebar) nexusSidebar.classList.remove('open');

            // Aplica/removes overrides para impedir comportamento CSS conflitante
            sidebar.classList.remove('override-close'); 

            // Toggle visibilidade
            sidebarToggle.classList.add('toggle-hidden'); // CRÍTICO: Esconde o toggle do Histórico quando a gaveta está sempre aberta
            if (nexusToggle) nexusToggle.classList.remove('toggle-hidden');

            // Body class: right sidebar is visible in this breakpoint
            document.body.classList.add('sidebar-visible');
            document.body.classList.remove('nexus-visible');
            
            // CRÍTICO: Garante que o botão flutuante esteja visível (a lógica do Teclado fará o hide/show)
            if (!keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden');


        // --- 3. Mobile (Width <= 900px) ---
        } else {
            // Estado padrão: Ambas fechadas. Toggles visíveis. Library é fixo.
            sidebar.classList.remove('open');
            if (nexusSidebar) nexusSidebar.classList.remove('open');
            
            // Aplica a classe para garantir que o CSS não force a abertura/fechamento
            sidebar.classList.add('override-close'); 
            if (nexusSidebar) nexusSidebar.classList.add('override-close');
            
            // Ambos os toggles visíveis.
            sidebarToggle.classList.remove('toggle-hidden');
            if (nexusToggle) nexusToggle.classList.remove('toggle-hidden');
            document.body.classList.remove('nexus-visible');
            
            // CRÍTICO: Garante que o botão do teclado seja visível no mobile se nada estiver aberto
            if (!keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden');
        }
    }

    // Adiciona a classe override-close para evitar que a regra CSS de 1201px abra tudo
    sidebar.classList.add('override-close');

    // Executa a lógica na inicialização
    applyResponsiveVisibility();

    // Executa a lógica no redimensionamento da janela
    window.addEventListener('resize', applyResponsiveVisibility);



// ===============================================================================================//
// ===============================================================================================// 
// Bloco 16: Lógica de Inserção de Fórmulas
    // --- INSERÇÃO DE FÓRMULAS NO EDITOR PRINCIPAL ---
    const formulaContentAreaEl = getEl('formula-content-area');

    if (formulaContentAreaEl && mf) {
        formulaContentAreaEl.addEventListener('click', (e) => {
            // Verifica se o clique foi dentro de um .formula-item
            const formulaItem = e.target.closest('.formula-item');
            
            if (formulaItem) {
                // Tenta encontrar o math-field interno, que contém o valor LaTeX
                const formulaMathField = formulaItem.querySelector('math-field[read-only]');
                
                if (formulaMathField) {
                    // Obtém o valor LaTeX completo da fórmula. O MathLive pode expor
                    // o conteúdo via atributo `value`, via propriedade `.value` ou
                    // via API `.getValue()`; tentamos de forma robusta.
                    let latexValue = null;

                    try {
                        if (formulaMathField.getAttribute && formulaMathField.getAttribute('value')) {
                            latexValue = formulaMathField.getAttribute('value');
                        } else if (typeof formulaMathField.getValue === 'function') {
                            // prefer explicit format when available
                            try { latexValue = formulaMathField.getValue('latex'); } catch (err) { latexValue = formulaMathField.getValue(); }
                        } else if (typeof formulaMathField.value !== 'undefined') {
                            latexValue = formulaMathField.value;
                        }
                    } catch (err) {
                        // silenciosamente ignore e continue
                    }

                    if (latexValue && typeof latexValue === 'string') {
                        // Remove comandos de texto e espaços extras
                        latexValue = latexValue.replace(/\\text\{.*?\}/g, '').trim();
                    }

                    if (latexValue) {
                        // Insere a fórmula COMPLETA no editor principal
                        mf.setValue(latexValue);
                        mf.focus();
                        setTimeout(updateTechPane, 100);
                    }
                }
            }
        });
        // Ensure each .formula-item has a transparent overlay that captures clicks
        function ensureFormulaOverlays() {
            document.querySelectorAll('.formula-item').forEach(item => {
                // set math-field to be non-focusable to avoid caret from keyboard/tab
                const mfChild = item.querySelector('math-field');
                if (mfChild) {
                    try { mfChild.setAttribute('tabindex', '-1'); } catch (e) {}
                    try { mfChild.setAttribute('aria-hidden', 'true'); } catch (e) {}
                }

                if (!item.querySelector('.formula-overlay')) {
                    const ov = document.createElement('div');
                    ov.className = 'formula-overlay';
                    // clicking the overlay should bubble and be handled by existing delegation
                    item.appendChild(ov);
                }
            });
        }

        // Run once and after any layout update that might add/remove formula items
        ensureFormulaOverlays();
        // If future dynamic insertion occurs, keep overlays in sync on resize
        window.addEventListener('resize', () => { setTimeout(ensureFormulaOverlays, 80); });
    }

};