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
    
    // Elementos da Sidebar
    const sidebar = getEl('app-sidebar');
    const sidebarToggle = getEl('sidebar-toggle');

    // Elementos do Memorial 
    const memorialSidebar = getEl('app-memorial');
    const memorialToggle = getEl('memorial-toggle');
    const memorialRecolher = getEl('memorial-recolher'); 
    
    // NOVO: Adiciona o botão Limpar Histórico para ser excluído na lógica de clique fora
    const clearHistBtn = getEl('clear-history-btn');

// Bloco 2: Lógica de Botões de Cálculo (HTML States)
    const CALCULATE_NORMAL_HTML = `<span class="material-icons-round calculate-icon">calculate</span> Calcular`;
    const CALCULATE_LOADING_HTML = `<span class="material-icons-round loading-icon">autorenew</span> Calculando...`;

    // Garante que o botão esteja no estado NORMAL no início
    if (calculateBtn) {
        calculateBtn.innerHTML = CALCULATE_NORMAL_HTML;
        calculateBtn.classList.remove('loading');
    }

// Bloco 3: Lógica do Teclado Virtual (Toggle Keyboard)
    const keyboardContainer = getEl('virtual-keyboard-container');
    const keyboardToggleBtn = getEl('keyboard-toggle'); // Botão flutuante (ABRIR)

    function toggleKeyboard(open) {
        if (!keyboardContainer || !keyboardToggleBtn || !mf || !sidebarToggle || !memorialToggle) return; 
        
        const isOpen = open !== undefined ? open : !keyboardContainer.classList.contains('open');

        if (isOpen) {
            
            // CORREÇÃO CRÍTICA (1): Move a lógica de ocultar toggles laterais para o teclado ABRIR
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                 sidebarToggle.classList.add('hidden');
                 memorialToggle.classList.add('hidden');
            }
            
            mf.executeCommand('showVirtualKeyboard');
            keyboardContainer.classList.add('open');
            keyboardToggleBtn.classList.add('hidden'); // ESCONDE O BOTão FLUTUANTE
            
            body.classList.add('keyboard-open');
            mf.focus();
            
        } else {
            mf.executeCommand('hideVirtualKeyboard'); 
            keyboardContainer.classList.remove('open');
            
            // CORREÇÃO CRÍTICA (2): Reabilita o botão flutuante APENAS se NENHUM painel lateral estiver aberto E NÃO for tela grande.
            // O botão Teclado deve reaparecer se a gaveta do teclado fechar, a menos que estejamos em uma tela onde ele está permanentemente escondido pelo CSS/JS de responsividade.
            if (window.innerWidth <= LARGE_SCREEN_BREAKPOINT && !sidebar.classList.contains('open') && !memorialSidebar.classList.contains('open')) {
                // Adicionamos um pequeno timeout para evitar a reabertura imediata no Mac (bug de foco)
                setTimeout(() => {
                    keyboardToggleBtn.classList.remove('hidden'); 
                }, 100);
            }
            
            // Reabilita os botões laterais em mobile se o teclado fechar
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                // Apenas reabilita se o CSS não os escondeu completamente por breakpoint
                if (!sidebar.classList.contains('open')) sidebarToggle.classList.remove('hidden');
                if (!memorialSidebar.classList.contains('open')) memorialToggle.classList.remove('hidden'); 
            }
            body.classList.remove('keyboard-open');
        }
    }

    if (keyboardToggleBtn) {
        keyboardToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Garante que o clique para abrir o teclado sempre force a abertura
            toggleKeyboard(true); 
        });
        // Garante que o botão esteja visível na inicialização (será controlado pela lógica responsiva)
        keyboardToggleBtn.classList.remove('hidden');
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
    
    // Inicializa o estado: Funções (false)
    toggleMainContent(false); 
    
// Bloco 5: Lógica de Toggles de Sidebar (Histórico e Memorial)
    // --- LÓGICA DA SIDEBAR DESLIZANTE (HISTÓRICO) ---
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            const willOpen = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open'); 
            sidebar.classList.remove('override-close'); // Remove override se usado
            
            // Garante que a outra gaveta e o teclado fechem ao abrir esta
            if (willOpen) {
                 memorialSidebar.classList.remove('open');
                 toggleKeyboard(false); 
            } 
            
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                if (willOpen) {
                    // Histórico vai abrir -> Oculta Teclado e Memorial Toggle
                    keyboardToggleBtn.classList.add('hidden');
                    memorialToggle.classList.add('hidden');
                } else {
                    // Histórico vai fechar -> Re-habilita Teclado e Memorial Toggle (se o memorial não estiver aberto)
                    if (!memorialSidebar.classList.contains('open')) {
                        keyboardToggleBtn.classList.remove('hidden');
                        memorialToggle.classList.remove('hidden');
                    }
                }
            }
        });
    }

    // --- LÓGICA DA SIDEBAR MEMORIAL (NOVO) ---
    if (memorialToggle && memorialSidebar) {
        memorialToggle.addEventListener('click', () => {
            const willOpen = !memorialSidebar.classList.contains('open');
            memorialSidebar.classList.toggle('open');
            memorialSidebar.classList.remove('override-close'); // Remove override se usado
            
            // Garante que a outra gaveta e o teclado fechem ao abrir esta
            if (willOpen) {
                 sidebar.classList.remove('open');
                 toggleKeyboard(false); 
            } 
            
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                if (willOpen) {
                    // Memorial vai abrir -> Oculta Teclado e Histórico Toggle
                    keyboardToggleBtn.classList.add('hidden'); 
                    sidebarToggle.classList.add('hidden');
                } else {
                    // Memorial vai fechar -> Re-habilita Teclado e Histórico Toggle (se o histórico não estiver aberto)
                    if (!sidebar.classList.contains('open')) {
                        keyboardToggleBtn.classList.remove('hidden');
                        sidebarToggle.classList.remove('hidden');
                    }
                }
            }
        });
    }

    // Listener do novo botão de recolher (Botão de 'x' no Memorial)
    if (memorialRecolher) {
        memorialRecolher.addEventListener('click', () => {
            memorialSidebar.classList.remove('open');
            
            if (window.innerWidth <= MOBILE_BREAKPOINT) {
                // Ao fechar Memorial, se Histórico não estiver aberto, re-habilita Toggles
                if (!sidebar.classList.contains('open') && !keyboardContainer.classList.contains('open')) {
                    sidebarToggle.classList.remove('hidden');
                    keyboardToggleBtn.classList.remove('hidden');
                }
            }
        });
    }

// Bloco 6: Lógica de Fechamento por Clique Externo
    // --- FECHAR TECLADO, SIDEBAR E GERENCIAR CLIQUES NO STACKED PANEL POR CLIQUE FORA ---
    document.addEventListener('click', (e) => {
        const isClickOnSidebarToggle = sidebarToggle && sidebarToggle.contains(e.target);
        const isClickOnMemorialToggle = memorialToggle && memorialToggle.contains(e.target);
        const isClickOnMemorialRecolher = memorialRecolher && memorialRecolher.contains(e.target); 
        const isClickOnKeyboardToggle = keyboardToggleBtn && keyboardToggleBtn.contains(e.target);
        // NOVO: Verifica se o clique foi no botão Limpar Histórico
        const isClickOnClearHistBtn = clearHistBtn && clearHistBtn.contains(e.target);
        
        // Detecta se o clique foi dentro do container do teclado
        const isClickInsideKeyboard = keyboardContainer && keyboardContainer.contains(e.target);

        // --- Variáveis de verificação de foco ---
        const isClickOnEditor = mf && mf.contains(e.target);
        const isClickOnVariablePanel = variablesList && variablesList.contains(e.target);
        
        // --- 1. Lógica para fechar a Sidebar (Histórico) ---
        if (sidebar && sidebar.classList.contains('open')) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            
            // CRÍTICO: Não fechar se o clique for nos toggles, nem no botão Limpar (que está no sidebar)
            if (!isClickInsideSidebar && !isClickOnSidebarToggle && !isClickOnMemorialToggle && !isClickOnClearHistBtn) { 
                sidebar.classList.remove('open');
                // Reabilita os botões de toggle se o Histórico fechar e NADA mais estiver aberto
                if (window.innerWidth <= MOBILE_BREAKPOINT && !keyboardContainer.classList.contains('open') && !memorialSidebar.classList.contains('open')) {
                    keyboardToggleBtn.classList.remove('hidden');
                    memorialToggle.classList.remove('hidden'); 
                }
            }
        }
        
        // --- 1B. Lógica para fechar a Sidebar (Memorial) ---
        if (memorialSidebar && memorialSidebar.classList.contains('open')) {
            const isClickInsideMemorial = memorialSidebar.contains(e.target);
            
            // O Memorial só deve fechar se o clique NÃO FOR dentro dele, nem em nenhum dos toggles de painel
            if (!isClickInsideMemorial && !isClickOnMemorialToggle && !isClickOnMemorialRecolher && !isClickOnKeyboardToggle && !isClickInsideKeyboard && !isClickOnSidebarToggle) { 
                memorialSidebar.classList.remove('open');
                // Reabilita os botões de toggle se o Memorial fechar e NADA mais estiver aberto
                if (window.innerWidth <= MOBILE_BREAKPOINT && !keyboardContainer.classList.contains('open') && !sidebar.classList.contains('open')) {
                    sidebarToggle.classList.remove('hidden'); 
                    keyboardToggleBtn.classList.remove('hidden');
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

        // --- 3. Lógica para alternar o Conteúdo Interno das Abas (Handles) ---
        
        // Navegação de Categorias Fórmulas (Fórmulas Ativa) - REMOVIDO, pois agora é um painel de rolagem único.
        // Navegação de Abas Toolbar (Funções Ativa) - REMOVIDO, pois agora é um painel de rolagem único.
        
        // Esta seção pode ser omitida inteiramente agora que Funções e Fórmulas são rolagem única e não têm navegação interna.
        // Deixamos apenas o fechamento de painéis laterais (1, 1B e 2)
    });

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
            
            mf.addEventListener('keydown', (e) => {
                if (e.key === ' ') { 
                    e.preventDefault(); 
                    // Insere um espaço LaTeX (\;) para tentar forçar a revalidação
                    mf.executeCommand('insert', '\\;'); 
                    // MathLive geralmente renderiza bem com setTimeout após comandos
                    setTimeout(updateTechPane, 10); 
                    return; 
                }
                if (e.key === 'Enter') { e.preventDefault(); performCalculation(); }
            });

            // CORREÇÃO CRÍTICA: Revertendo para o listener de 'input' simples que funcionava
            mf.addEventListener('input', updateTechPane); 
            
            calculateBtn.addEventListener('click', () => toggleKeyboard(false));
            
        }
    } catch (e) { console.error("Erro MathLive:", e); }
    // --- FIM CONFIGURAÇÃO MATHLIVE ---

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

// Bloco 15: Lógica de Visibilidade Responsiva (NOVO)
    function applyResponsiveVisibility() {
        const width = window.innerWidth;
        
        if (!sidebar || !memorialSidebar || !sidebarToggle || !memorialToggle) return;

        // --- 1. Desktop/Widescreen (Width > 1200px) ---
        if (width > LARGE_SCREEN_BREAKPOINT) {
            // Estado padrão: Ambas abertas. Toggles invisíveis.
            sidebar.classList.add('open');
            memorialSidebar.classList.add('open');
            
            // Remove a classe que impede a abertura forçada pelo CSS
            sidebar.classList.remove('override-close'); 
            memorialSidebar.classList.remove('override-close');
            
            // Esconde os toggles (o CSS fará o trabalho real)
            sidebarToggle.classList.add('toggle-hidden');
            memorialToggle.classList.add('toggle-hidden');

        // --- 2. Tablet/Tela Média (901px a 1200px) ---
        } else if (width > MOBILE_BREAKPOINT && width <= LARGE_SCREEN_BREAKPOINT) {
            // Estado padrão: Histórico fechado, Memorial aberto. Toggles visíveis.
            sidebar.classList.remove('open');
            memorialSidebar.classList.add('open');
            
            // Aplica a classe para garantir que o CSS não force a abertura/fechamento
            sidebar.classList.add('override-close'); 
            memorialSidebar.classList.remove('override-close');
            
            // Toggle do Histórico visível. Toggle do Memorial escondido.
            sidebarToggle.classList.remove('toggle-hidden'); 
            memorialToggle.classList.add('toggle-hidden');

        // --- 3. Mobile (Width <= 900px) ---
        } else {
            // Estado padrão: Ambas fechadas. Toggles visíveis.
            sidebar.classList.remove('open');
            memorialSidebar.classList.remove('open');
            
            // Aplica a classe para garantir que o CSS não force a abertura/fechamento
            sidebar.classList.add('override-close'); 
            memorialSidebar.classList.add('override-close');
            
            // Ambos os toggles visíveis.
            sidebarToggle.classList.remove('toggle-hidden');
            memorialToggle.classList.remove('toggle-hidden');
            
            // Garante que o botão do teclado seja visível no mobile se nada estiver aberto
            if (!keyboardContainer.classList.contains('open')) keyboardToggleBtn.classList.remove('hidden');
        }
    }

    // Adiciona a classe override-close para evitar que a regra CSS de 1201px abra tudo
    sidebar.classList.add('override-close');
    memorialSidebar.classList.add('override-close');

    // Executa a lógica na inicialização
    applyResponsiveVisibility();

    // Executa a lógica no redimensionamento da janela
    window.addEventListener('resize', applyResponsiveVisibility);

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
                    // Obtém o valor LaTeX completo da fórmula
                    let latexValue = formulaMathField.value;
                    
                    // CORREÇÃO CRÍTICA (1): Não dividimos mais pelo '='.
                    // A fórmula completa, incluindo a variável de saída (ex: x=, c^2=), deve ser inserida.
                    
                    // Limpa quaisquer comandos de texto remanescentes
                    latexValue = latexValue.replace(/\\text\{.*?\}/g, '').trim();

                    if (latexValue) {
                        // Insere a fórmula COMPLETA no editor principal
                        mf.setValue(latexValue); 
                        mf.focus();
                        setTimeout(updateTechPane, 100); 
                    }
                }
            }
        });
    }

};