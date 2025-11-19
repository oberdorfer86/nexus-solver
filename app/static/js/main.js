window.onload = function() {
    console.log(">>> NEXUS SOLVER - System Init <<<");

    const getEl = (id) => document.getElementById(id);
    
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
    // CORRIGIDO: getG alterado para getEl
    const excelInput = getEl('excel-code'); 
    const calcLabelInput = getEl('calc-label');
    
    const historyList = getEl('history-list');
    const variablesList = getEl('variables-list');
    const addVariableBtn = getEl('add-variable-btn');

    // --- LÓGICA DO BOTÃO CALCULAR ---
    const CALCULATE_NORMAL_HTML = `<span class="material-icons-round calculate-icon">calculate</span> Calcular`;
    const CALCULATE_LOADING_HTML = `<span class="material-icons-round loading-icon">autorenew</span> Calculando...`;

    // Garante que o botão esteja no estado NORMAL no início
    if (calculateBtn) {
        calculateBtn.innerHTML = CALCULATE_NORMAL_HTML;
        calculateBtn.classList.remove('loading');
    }
    // --- FIM LÓGICA BOTÃO ---

    // --- LÓGICA DA SIDEBAR DESLIZANTE (NEXUS SLIDER) ---
    const sidebar = getEl('app-sidebar');
    const sidebarToggle = getEl('sidebar-toggle');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Fecha a sidebar se clicar fora dela (UX para telas menores)
        document.addEventListener('click', (e) => {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnToggle = sidebarToggle.contains(e.target);
            
            if (sidebar.classList.contains('open') && !isClickInsideSidebar && !isClickOnToggle) {
                sidebar.classList.remove('open');
            }
        });
    }

    // --- FUNÇÕES AUXILIARES ---
    function cleanMathString(str) {
        if (!str) return "";
        let clean = str.replace(/["']/g, ""); 
        clean = clean.replace(/\u00A0/g, " "); 
        clean = clean.replace(/\\;/g, " "); 
        clean = clean.replace(/\\:/g, " "); 
        clean = clean.replace(/\s+/g, ""); 
        return clean;
    }

    function getExcelFormat(expr) {
        if (!expr) return "";
        let cleanExpr = cleanMathString(expr); 
        const lower = cleanExpr.toLowerCase();
        const invalidPatterns = ['int', '∫', 'integral', 'diff', 'd/d', 'partial', '∂', 'lim', 'limit', 'sum', '∑', '='];
        for (let pattern of invalidPatterns) {
            if (lower.includes(pattern)) return "⚠️ N/A (Cálculo Simbólico)";
        }
        return "=" + cleanExpr.replace(/\^/g, "^"); 
    }

    function updateTechPane() {
        if (!mf) return;
        let currentLatex = mf.getValue();
        let currentAscii = mf.getValue("ascii-math");
        let cleanLatex = currentLatex.replace(/\\;/g, " "); 
        cleanLatex = cleanLatex.replace(/\s{2,}/g, " "); 
        if (latexInput) latexInput.value = cleanLatex;
        if (excelInput) excelInput.value = getExcelFormat(currentAscii);
    }

    // --- CONFIGURAÇÃO DO EDITOR MATHLIVE ---
    try {
        if (mf) {
            mf.setOptions({ smartMode: true, virtualKeyboardMode: 'manual', keypressSound: null });
            mf.addEventListener('keydown', (e) => {
                if (e.key === ' ') { e.preventDefault(); mf.executeCommand('insert', '\\;'); setTimeout(updateTechPane, 10); return; }
                if (e.key === 'Enter') { e.preventDefault(); performCalculation(); }
            });
            mf.addEventListener('input', updateTechPane);
        }
    } catch (e) { console.error("Erro MathLive:", e); }

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
            const titleHtml = item.label ? `<span style="color: var(--primary); font-weight: bold;">${item.label}</span>` : `<span style="color: var(--text-muted);">Input: <math-field read-only style="font-size: 0.85em; display: inline;">${item.latex}</math-field></span>`;
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
                if(confirm("Excluir do histórico?")) {
                    calculationHistory.splice(indexToDelete, 1);
                    localStorage.setItem('engineer_v5_history', JSON.stringify(calculationHistory));
                    updateHistoryUI();
                }
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
    const clearHistBtn = getEl('clear-history-btn');
    if (clearHistBtn) clearHistBtn.addEventListener('click', () => { calculationHistory = []; localStorage.removeItem('engineer_v5_history'); updateHistoryUI(); });
    updateHistoryUI();

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
                    <input type="text" class="var-name" value="${v.name}" placeholder="Var" data-index="${index}">
                    <input type="text" class="var-value" value="${v.value}" placeholder="Valor" data-index="${index}">
                    <input type="text" class="var-unit" value="${v.unit}" placeholder="Unid." data-index="${index}">
                    ${restoreButtonHtml}
                    <span class="material-icons-round delete-btn" data-index="${index}" title="Excluir">close</span>
                `;
                variablesList.appendChild(div);
            });
            variablesList.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = e.target.dataset.index;
                    if (e.target.className.includes('name')) variables[idx].name = e.target.value;
                    if (e.target.className.includes('value')) variables[idx].value = e.target.value;
                    if (e.target.className.includes('unit')) variables[idx].unit = e.target.value;
                    saveVariables();
                });
            });
            variablesList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => { if(confirm("Excluir esta variável?")) { variables.splice(e.target.dataset.index, 1); renderVariables(); saveVariables(); } });
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

    // --- 5. FUNÇÃO DE CÁLCULO (COM PLOTLY) ---
    async function performCalculation() {
        if (!mf) return;
        
        let rawExpression = mf.getValue("ascii-math"); 
        let expression = cleanMathString(rawExpression); 
        let latexVal = mf.getValue(); 
        let calcLabel = calcLabelInput ? calcLabelInput.value.trim() : ""; 
        
        updateTechPane(); 

        const variableMap = {};
        variables.forEach(v => { if (v.name && v.value) variableMap[v.name] = v.value; });

        if (!expression) { alert("Digite uma expressão."); return; }

        if (calculateBtn) {
            calculateBtn.disabled = true;
            // Estado Loading: Altera o HTML e adiciona a classe
            calculateBtn.classList.add('loading');
            calculateBtn.innerHTML = CALCULATE_LOADING_HTML; 
        }
        
        if (resultMf) resultMf.setValue("\\text{Calculando...}");
        if (resultCard) resultCard.classList.remove('hidden');
        
        if (plotContainer) plotContainer.style.display = 'none';

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
                        
                        // Layout do Plotly (Mantido)
                        const layout = {
                            margin: { t: 20, r: 20, b: 40, l: 50 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            xaxis: { 
                                showgrid: true, gridcolor: '#e5e7eb', zeroline: true, zerolinecolor: '#9ca3af',
                                title: 'x' 
                            },
                            yaxis: { 
                                showgrid: true, gridcolor: '#e5e7eb', zeroline: true, zerolinecolor: '#9ca3af',
                                title: 'f(x)' 
                            },
                            showlegend: true,
                            hovermode: 'closest'
                        };
                        
                        const trace = {
                            x: data.plot_data.x,
                            y: data.plot_data.y,
                            mode: 'lines',
                            line: { color: '#3b82f6', width: 3 },
                            name: 'f(x)',
                            type: 'scatter'
                        };

                        const config = {
                            responsive: true,
                            displayModeBar: true,
                            displaylogo: false,
                            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                            toImageButtonOptions: {
                                format: 'png', filename: 'nexus_grafico',
                                height: 600, width: 1200, scale: 2
                            }
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
                // Estado Normal: Remove a classe e restaura o HTML 
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
    });

    // --- TOOLBAR CLICK ---
    const toolbar = document.querySelector('.toolbar-content');
    if (toolbar) toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (btn && mf) {
            const latex = btn.dataset.latex;
            if (latex) { mf.executeCommand('insert', latex); mf.focus(); updateTechPane(); }
        }
    });

    // --- NAVEGAÇÃO POR ABAS ---
    const tabsContainer = document.querySelector('.toolbar-tabs');
    if (tabsContainer) tabsContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab');
        if (!clickedTab) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.toolbar-pane').forEach(p => p.classList.remove('active'));
        clickedTab.classList.add('active');
        const targetPane = document.getElementById(clickedTab.dataset.target);
        if (targetPane) targetPane.classList.add('active');
        if (mf) mf.focus();
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
            const gridColor = next === 'dark' ? '#374151' : '#e5e7eb';
            const zeroColor = next === 'dark' ? '#9ca3af' : '#9ca3af';
            const layoutUpdate = {
                'xaxis.gridcolor': gridColor, 'yaxis.gridcolor': gridColor,
                'xaxis.zerolinecolor': zeroColor, 'yaxis.zerolinecolor': zeroColor
            };
            Plotly.relayout(plotlyDivId, layoutUpdate);
        }
    });

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
            if (!varName) { varName = prompt("Nome da variável (ex: r):", "r"); if (!varName) return; }
            let originalFormula = mf.getValue("latex");
            const existingIndex = variables.findIndex(v => v.name === varName);
            const emptySlotIndex = variables.findIndex(v => v.name.trim() === "");
            const newVar = { name: varName, value: varValue, unit: '', origin: originalFormula };
            if (existingIndex >= 0) {
                if(confirm(`A variável "${varName}" já existe.\n\n[OK] Substituir.\n[Cancelar] Criar NOVA.`)) variables[existingIndex] = newVar;
                else { let newName = prompt("Nome NOVA variável:", varName + "_nova"); if(newName) { newVar.name = newName; variables.push(newVar); } }
            } else if (emptySlotIndex >= 0) variables[emptySlotIndex] = newVar;
            else variables.push(newVar);
            saveVariables(); renderVariables();
            const originalHtml = saveVarBtn.innerHTML; saveVarBtn.innerHTML = '<span class="material-icons-round">check</span> Salvo!';
            setTimeout(() => { saveVarBtn.innerHTML = originalHtml; }, 1500);
        });
    }
};