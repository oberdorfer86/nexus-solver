// Bloco 1: Inicialização e Declaração de Constantes Globais
window.onload = function() {
    console.log(">>> NEXUS SOLVER - System Init <<<");

    const getEl = (id) => document.getElementById(id);
    const body = document.body;
    
    // NOVO: Adiciona uma constante para o breakpoint grande
    const LARGE_SCREEN_BREAKPOINT = 1200; 
    const MOBILE_BREAKPOINT = 900;
    
    // VARIÁVEIS PRINCIPAIS (usadas em todo o escopo)
    const mf = getEl('math-editor');
    const resultMf = getEl('result-output');
    const resultCard = getEl('result-area');
    
    // Container do Gráfico (DIV do Plotly)
    const plotContainer = getEl('plot-container');
    const plotlyDivId = 'plotly-graph'; 
    
    const calculateBtn = getEl('calculate-btn');
    const clearBtn = getEl('clear-btn');
    const saveVarBtn = getEl('save-var-btn'); 
    
    const latexInput = getEl('latex-code');
    const excelInput = getEl('excel-code'); 
    const calcLabelInput = getEl('calc-label');

    function insertIntoMathEditor(value) {
        if (!mf || !value) return;
        try {
            mf.executeCommand && mf.executeCommand('insert', value);
            mf.focus && mf.focus();
            setTimeout(() => updateTechPane(), 10);
        } catch (err) {
            console.warn('insertIntoMathEditor error', err);
        }
    }

    window.nexusInsertSymbol = insertIntoMathEditor;
    
    // Elementos de Gestão de Estado
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
    
    // Elementos da Sidebar (Histórico - Direita) - NOVO
    const sidebar = getEl('history-sidebar');
    const sidebarToggle = getEl('history-toggle-btn');
    
    // Elementos NEXUS (novo sidebar esquerdo) - NOVO
    const nexusSidebar = document.querySelector('.sidebar.left');
    const nexusToggle = document.querySelector('.menu-toggle');

    // Elementos Diversos
    const keyboardContainer = getEl('virtual-keyboard-container');
    const keyboardToggleBtn = getEl('keyboard-toggle'); // Botão flutuante (ABRIR)
    const clearHistBtn = getEl('clear-history-btn');
    const mainContent = document.querySelector('.main-content');
    const panelTitle = document.querySelector('.app-header h1'); 
    
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
// -----


// Bloco 2: Lógica de Botões de Cálculo (HTML States)
// -----
    const CALCULATE_NORMAL_HTML = `<span class="material-icons-round calculate-icon">calculate</span> Calcular`;
    const CALCULATE_LOADING_HTML = `<span class="material-icons-round loading-icon">autorenew</span> Calculando...`;

    // Garante que o botão esteja no estado NORMAL no início
    if (calculateBtn) {
        calculateBtn.innerHTML = CALCULATE_NORMAL_HTML;
        calculateBtn.classList.remove('loading');
        // Adiciona o listener para o cálculo no bloco correto
        calculateBtn.addEventListener('click', performCalculation);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (mf) mf.setValue('');
            if (resultMf) resultMf.setValue('');
            if (resultCard) _safeAddClass(resultCard, 'hidden');
            if (calcLabelInput) calcLabelInput.value = '';
            if (plotContainer) plotContainer.style.display = 'none';
            updateTechPane();
            mf.focus();
        });
    }
// -----


// Bloco 3: Lógica do Teclado Virtual (Toggle Keyboard)
// -----
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
// -----





// Bloco 4: Lógica de Alternância Principal (Master Tabs)
// -----
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

            // Título da Aba deve ser o Título principal
            if (panelTitle) panelTitle.textContent = "NEXUS Library | Fórmulas";
            
            // O botão do teclado permanece visível (se o teclado estiver fechado)
            if (keyboardToggleBtn && !keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden');

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

            if (panelTitle) panelTitle.textContent = "NEXUS Solver | Funções";
            
            // Mostra o botão do teclado
            if (keyboardToggleBtn && !keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden'); 
            if (mf) mf.focus();

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
            // Insere a navegação ANTES do primeiro título encontrado.
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
        // botão base tamanho (px) - corresponde ao CSS: flex basis 50px
        const defaultBtnSize = 44; 
        const defaultGap = 8;

        const processGroup = (group) => {
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

            const btnSize = defaultBtnSize;
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
        document.querySelectorAll('#toolbar-content-area .toolbar-group').forEach(processGroup);
        document.querySelectorAll('#formula-content-area .toolbar-group').forEach(processGroup);
    }

    // Run initially and on resize (debounced)
    adjustToolbarGroupWidths();
    let resizeTimer = null;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { adjustToolbarGroupWidths(); }, 120); });

    // Inicializamos o estado da aba principal para Funções e ajustamos a visibilidade das navs.
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
// -----

  



// Bloco 5: Lógica de Toggles de Sidebar (Histórico e Nexus)
// -----
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
// -----






// Bloco 6: Lógica de Fechamento por Clique Externo
// -----
    document.addEventListener('click', (e) => {
        
        // --- Lógica de Fechamento de Gavetas (Sidebar/Nexus) ---
        
        // CRÍTICO: Se a tela for WIDESCREEN (> 1200px), NÃO permitir o fechamento das sidebars por clique externo.
        if (window.innerWidth > LARGE_SCREEN_BREAKPOINT) {
            // A única coisa que pode fechar por clique externo é o teclado virtual.
             const isClickOnKeyboardToggle = keyboardToggleBtn && keyboardToggleBtn.contains(e.target);
             const isClickInsideKeyboard = keyboardContainer && keyboardContainer.contains(e.target);
             const isClickOnEditor = mf && (mf.contains(e.target) || document.activeElement === mf);
             const isClickOnVariablePanel = variablesList && variablesList.contains(e.target);

             if (keyboardContainer && keyboardContainer.classList.contains('open')) {
                 if (!isClickInsideKeyboard && !isClickOnEditor && !isClickOnKeyboardToggle && !isClickOnVariablePanel) {
                     toggleKeyboard(false);
                 }
             }
             return; // Sai da função, impedindo o fechamento das sidebars fixas
        }

        // --- Lógica de Fechamento de Gavetas (Tablet/Mobile: <= 1200px) ---
        const isClickOnSidebarToggle = sidebarToggle && sidebarToggle.contains(e.target);
        const isClickOnNexusToggle = nexusToggle && nexusToggle.contains(e.target);
        const isClickOnKeyboardToggle = keyboardToggleBtn && keyboardToggleBtn.contains(e.target);
        const isClickOnClearHistBtn = clearHistBtn && clearHistBtn.contains(e.target);

        // Define as variáveis de clique interno/externo novamente para este escopo
        const isClickInsideKeyboard = keyboardContainer && keyboardContainer.contains(e.target);
        const isClickOnEditor = mf && (mf.contains(e.target) || document.activeElement === mf);
        const isClickOnVariablePanel = variablesList && variablesList.contains(e.target);
        
        // Fechar Sidebar (Histórico)
        if (sidebar && sidebar.classList.contains('open')) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            if (!isClickInsideSidebar && !isClickOnSidebarToggle && !isClickOnClearHistBtn) {
                sidebar.classList.remove('open');
                document.body.classList.remove('sidebar-visible');
                // Reabilita o toggle NEXUS se não houver outras gavetas abertas
                if (window.innerWidth <= MOBILE_BREAKPOINT && !keyboardContainer.classList.contains('open') && nexusToggle) {
                    if (nexusSidebar && !nexusSidebar.classList.contains('open')) _safeRemoveClass(nexusToggle, 'hidden');
                }
            }
        }

        // Fechar Nexus Sidebar (Esquerda)
        if (nexusSidebar && nexusSidebar.classList.contains('open')) {
            const isClickInsideNexus = nexusSidebar.contains(e.target);
            if (!isClickInsideNexus && !isClickOnNexusToggle) {
                nexusSidebar.classList.remove('open');
                document.body.classList.remove('nexus-visible');
                // Reabilita o toggle Histórico
                if (window.innerWidth <= MOBILE_BREAKPOINT && !keyboardContainer.classList.contains('open') && sidebarToggle) {
                    if (sidebar && !sidebar.classList.contains('open')) _safeRemoveClass(sidebarToggle, 'hidden');
                }
            }
        }

        // Fechar Teclado Virtual (sempre é um overlay)
        if (keyboardContainer && keyboardContainer.classList.contains('open')) {
            if (!isClickInsideKeyboard && !isClickOnEditor && !isClickOnKeyboardToggle && !isClickOnVariablePanel) {
                toggleKeyboard(false);
            }
        }
    });
// -----







    // ===============================================================================================
    // Bloco 7: Funções Auxiliares
    // -----
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
    // -----

    // ===============================================================================================
    // Bloco 8: Atualização do Painel Técnico
    // -----
    function updateTechPane() {
        if (!mf) return;
        let currentLatex = mf.getValue("latex");
        let cleanLatex = currentLatex.replace(/\\textasciicircum/g, '^').replace(/\\;/g, " ").replace(/\s{2,}/g, " "); 
        if (latexInput) latexInput.value = cleanLatex;

        let currentAscii = mf.getValue("ascii-math");
        if (excelInput) excelInput.value = getExcelFormat(currentAscii); 
    }
    updateTechPane();
    // -----


// Bloco 9: Configuração e Eventos do MathLive
// -----
    try {
        if (mf) {
            mf.setOptions({ 
                smartMode: true, 
                virtualKeyboardMode: 'manual', 
                virtualKeyboardToolbar: 'none', 
                virtualKeyboardContainer: keyboardContainer, 
                keypressSound: null 
            });

            mf.addEventListener('keydown', (e) => {
                if (e.key === ' ') {
                    e.preventDefault();
                    mf.executeCommand('insert', '\\;');
                    setTimeout(updateTechPane, 10);
                    return;
                }
                if (e.key === 'Enter') { e.preventDefault(); performCalculation(); }
            });

            mf.addEventListener('focus', () => { setTimeout(updateTechPane, 10); });
            // Remove o listener que estava aqui
            mf.addEventListener('blur', () => {});

            mf.addEventListener('input', updateTechPane);
            
            // O listener para o calculateBtn foi movido para o Bloco 2
            // O listener de toggleKeyboard para o calculateBtn foi removido, a lógica está no performCalculation
        }
    } catch (e) { console.error("Erro Solver MathLive:", e); }
// -----

    // ===============================================================================================
    // Bloco 10: Lógica de Histórico
    // -----
    let calculationHistory = JSON.parse(localStorage.getItem('solver_history') || '[]');

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
        localStorage.setItem('solver_history', JSON.stringify(calculationHistory));
        updateHistoryUI();
    }

    if (historyList) {
        historyList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            const historyItem = e.target.closest('.history-item');
            if (deleteBtn) {
                const indexToDelete = parseInt(deleteBtn.dataset.index);
                calculationHistory.splice(indexToDelete, 1);
                localStorage.setItem('solver_history', JSON.stringify(calculationHistory));
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

    if (clearHistBtn) clearHistBtn.addEventListener('click', () => { 
        if(confirm("Limpar todo o histórico?")) {
            calculationHistory = []; 
            localStorage.removeItem('solver_history'); 
            updateHistoryUI(); 
        }
    });

    updateHistoryUI();
    // -----

    // ===============================================================================================
    // Bloco 11: Lógica de Variáveis
    // -----
    let variables = JSON.parse(localStorage.getItem('solver_variables') || '[]');
    if (variablesList) {
        function saveVariables() { localStorage.setItem('solver_variables', JSON.stringify(variables)); }
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
                    <math-field class="var-value-editor" data-index="${index}" placeholder="Valor" value="${v.value.replace(/\\/g, '\\\\')}" smart-mode virtual-keyboard-mode="off" virtual-keyboard-toolbar="none"></math-field>
                    <input type="text" class="var-unit" value="${v.unit}" placeholder="Unid." data-index="${index}">
                    ${restoreButtonHtml}
                    <span class="material-icons-round delete-btn" data-index="${index}" title="Excluir">close</span>
                `;
                variablesList.appendChild(div);
            });

            variablesList.querySelectorAll('.var-name, .var-unit').forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = e.target.dataset.index;
                    if (e.target.className.includes('name')) variables[idx].name = e.target.value;
                    if (e.target.className.includes('unit')) variables[idx].unit = e.target.value;
                    saveVariables();
                });
            });

            variablesList.querySelectorAll('.var-value-editor').forEach(mfEl => {
                mfEl.addEventListener('input', (e) => {
                    const idx = e.target.dataset.index;
                    variables[idx].value = mfEl.getValue('latex'); 
                    const insertBtn = e.target.closest('.variable-item')?.querySelector('.insert-var-btn');
                    if (insertBtn) insertBtn.dataset.varvalue = variables[idx].value;
                    saveVariables();
                });
            });

            variablesList.querySelectorAll('.insert-var-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const varName = e.target.dataset.varname; 
                    if (varName && mf) { mf.executeCommand('insert', varName.trim()); mf.focus(); setTimeout(updateTechPane, 10); }
                });
            });

            variablesList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => { 
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
    // -----

    
    
    
    // Bloco 12: Função de Cálculo Principal
// -----
    async function performCalculation() {
        if (!mf) return;
        const rawExpression = mf.getValue("ascii-math"); 
        const expression = cleanMathString(rawExpression); 
        const latexVal = mf.getValue(); 
        const calcLabel = calcLabelInput ? calcLabelInput.value.trim() : ""; 

        updateTechPane(); 

        const variableMap = {};
        variables.forEach(v => { 
            const varName = v.name?.trim();
            const varValue = v.value?.trim();
            if (varName && varValue) variableMap[varName] = varValue; 
        });

        if (!expression) { alert("Digite uma expressão."); return; }

        if (calculateBtn) {
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = CALCULATE_LOADING_HTML;
            calculateBtn.classList.add('loading');
        }

        if (resultMf) resultMf.setValue("\\text{Calculando...}");
        if (resultCard) _safeRemoveClass(resultCard, 'hidden'); // CRÍTICO: Exibe o painel de resultado
        if (plotContainer) plotContainer.style.display = 'none';

        toggleKeyboard(false); // Fecha o teclado

        try {
            const response = await fetch('api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expression, variables: variableMap })
            });
            const data = await response.json();

            if (response.ok) {
                // Sucesso
                const resultLatex = data.result_latex || "\\text{Erro (Sem resultado).}";
                const plotData = data.plot_data;
                
                // 1. Exibe o resultado e o painel
                if (resultMf) resultMf.setValue(resultLatex);
                if (resultCard) _safeRemoveClass(resultCard, 'hidden'); // REFORÇO: Garante que o painel de resultado está visível
                
                // 2. Lógica de Plotagem (Plotly)
                if (plotData && plotData.x.length > 0 && window.Plotly) {
                    const trace = {
                        x: plotData.x,
                        y: plotData.y,
                        mode: 'lines',
                        type: 'scatter',
                        line: { color: 'var(--primary)' }
                    };
                    const layout = {
                        title: calcLabel || 'Resultado da Expressão',
                        xaxis: { title: 'Variável x' },
                        yaxis: { title: 'Resultado f(x)' },
                        responsive: true,
                        margin: { t: 40, b: 40, l: 40, r: 20 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        font: { color: 'var(--text-main)' }
                    };
                    
                    if (plotContainer) plotContainer.style.display = 'flex';
                    window.Plotly.newPlot(plotlyDivId, [trace], layout, { responsive: true, displayModeBar: false });
                    
                    // Ajuste de cor de texto para dark mode (precisa ser feito após a plotagem)
                    const isDarkMode = document.body.classList.contains('dark-theme');
                    if (isDarkMode) {
                         window.Plotly.relayout(plotlyDivId, {
                            font: { color: 'var(--text-main)' },
                            xaxis: { title: { font: { color: 'var(--text-main)' } } },
                            yaxis: { title: { font: { color: 'var(--text-main)' } } }
                        });
                    }

                } else {
                    if (plotContainer) plotContainer.style.display = 'none';
                }

                addToHistory(latexVal, resultLatex, calcLabel);
                updateTechPane(); 

            } else {
                // Erro (Exibido pela API)
                if (resultMf) resultMf.setValue(data.error || "\\text{Erro desconhecido}");
                if (resultCard) _safeRemoveClass(resultCard, 'hidden'); // Exibe o painel de erro
            }
        } catch (error) {
            console.error("Erro Fetch:", error);
            if (resultMf) resultMf.setValue("\\text{Erro de conexão com o servidor}");
        } finally {
            if (calculateBtn) { 
                calculateBtn.disabled = false; 
                calculateBtn.innerHTML = CALCULATE_NORMAL_HTML;
                calculateBtn.classList.remove('loading'); 
            }
            if (mf) mf.focus(); 
        }
    }
// -----









// Bloco 13: Lógica de Toggles de Tema e Toolbar
// Esta lógica foi movida/removida, e o restante das funções abaixo foram incorporadas.
// -----
    // --- LÓGICA DE TEMA (APLICADA AO HTML BASE) ---
    // Este micro-app não deve gerenciar o tema, deve herdar do Shell (core.js/base.html)

    // O Botão de limpar editor foi movido para o Bloco 2.
    // O Botão alternar teclado virtual foi movido para o Bloco 3.
// -----


// Bloco 14: Lógica de Salvar Variável
// -----
    if (saveVarBtn) {
        saveVarBtn.addEventListener('click', () => {
            let rawLatex = resultMf ? resultMf.getValue() : ""; 
            if (!rawLatex || rawLatex.includes("\\text{Calculando") || rawLatex.trim() === "") { alert("Calcule algo primeiro."); return; }
            let cleanStr = rawLatex.replace(/\\text\{.*?\}/g, '').trim();
            let varName = "", varValue = "";
            if (cleanStr.includes('=')) { const parts = cleanStr.split('='); varName = parts[0].trim(); varValue = parts[1].trim(); } 
            else { varValue = cleanStr; varName = calcLabelInput ? calcLabelInput.value.trim().split(' ')[0] : ""; }
            varValue = varValue.replace(/\\[a-zA-Z]+/g, '').replace(/[{}]/g, '').trim(); 
            varName = varName.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\s+/g, '_').trim(); 

            if (!varName) { varName = prompt("Nome da variável (ex: r):", "r"); if (!varName) return; }
            let originalFormula = mf ? mf.getValue("latex") : "";
            const existingIndex = variables.findIndex(v => v.name === varName);
            const emptySlotIndex = variables.findIndex(v => v.name.trim() === "");
            const newVar = { name: varName, value: varValue, unit: '', origin: originalFormula };
            if (existingIndex >= 0) {
                if(confirm(`A variável "${varName}" já existe.\n\n[OK] Substituir.\n[Cancelar] Criar NOVA.`)) variables[existingIndex] = newVar;
                else { 
                    let newName = prompt("Nome NOVA variável:", varName + "_nova"); 
                    if(newName) { newVar.name = newName.replace(/\s+/g, '_'); variables.push(newVar); }
                }
            } else if (emptySlotIndex >= 0) variables[emptySlotIndex] = newVar;
            else variables.push(newVar);
            saveVariables(); renderVariables();
        });
    }
// -----




// Bloco 15: Lógica de Visibilidade Responsiva (O PRINCIPAL)
// -----
function solverApplyResponsiveVisibility() {
    const width = window.innerWidth;
    
    // 1. PC/TABLET (Fixo e Aberto) - Width > 900px
    if (width > MOBILE_BREAKPOINT) { 
        
        // Histórico (Direita) - Fixo e Aberto (Requisito: PC e Tablet)
        _safeAddClass(sidebar, 'open');
        _safeAddClass(body, 'sidebar-visible'); // Aplica deslocamento no conteúdo principal
        _safeAddClass(sidebarToggle, 'hidden'); // Esconde o botão de toggle

    } 
    // 2. MOBILE (Overlay e Fechado com Botão) - Width <= 900px
    else {
        
        // Histórico (Direita) - Overlay (Fechada por padrão)
        _safeRemoveClass(body, 'sidebar-visible'); // Remove deslocamento
        sidebar.classList.remove('open'); // Garante que esteja fechada ao entrar no mobile
        
        // Mostra o botão de toggle da sidebar de Histórico
        _safeRemoveClass(sidebarToggle, 'hidden'); 
    }
}

// Inicialização e Resize Listener (parte final do Bloco 15)
// solverSidebar.classList.add('override-close'); // Manter se necessário
setTimeout(solverApplyResponsiveVisibility, 50);
window.addEventListener('resize', solverApplyResponsiveVisibility);
// -----







// Bloco 16: Lógica de Inserção de Fórmulas
// -----
     const formulaContentAreaEl = getEl('formula-content-area');
    if (formulaContentAreaEl && mf) {
        formulaContentAreaEl.addEventListener('click', (e) => {
            // CRÍTICO: Usa o overlay para capturar o clique
            const formulaOverlay = e.target.closest('.formula-item .formula-overlay');
            if (!formulaOverlay) return;
            
            const formulaItem = formulaOverlay.closest('.formula-item');
            if (!formulaItem) return;
            
            const formulaMathField = formulaItem.querySelector('math-field[read-only]');
            if (!formulaMathField) return;

            let latexValue = formulaMathField.getAttribute('value') || 
                             (formulaMathField.getValue ? formulaMathField.getValue('latex') : '');
            if (!latexValue) return;

            // Remove placeholders text from formula
            latexValue = latexValue.replace(/\\text\{.*?\}/g, '').trim();
            if (mf) mf.setValue(latexValue);
            if (mf) mf.focus();
            setTimeout(updateTechPane, 100);
        });
    }
// -----




// Bloco 17: Lógica do Botão Toggle (Mobile)
// -----
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Previne conflitos com o Bloco 6 (Clique Externo)
            
            // Toggle do estado 'open'
            const isOpen = sidebar.classList.toggle('open');
            
            // Gerencia a classe de deslocamento no body 
            if (isOpen) {
                _safeAddClass(body, 'sidebar-visible');
            } else {
                _safeRemoveClass(body, 'sidebar-visible');
            }
        });
    }

// -----