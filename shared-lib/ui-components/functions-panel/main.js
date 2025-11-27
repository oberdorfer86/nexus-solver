// Bloco 1: Lógica da barra de funções (Inicialização e Definição de Dados)
// Este arquivo contém a lógica de dados, renderização e interatividade
export function initBarra(options = {}) {
    const {
        containerId = 'functions-panel-container',
        onInsert,
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    // --- 1. Definição do Conteúdo (Dados) ---
    const basicMathButtons = [
        { label: '+', value: '+' },
        { label: '-', value: '-' },
        { label: '×', value: '*' },
        { label: '()', value: '\\left( \\right)' },
        { label: 'frac', value: '\\frac{ }{ }', isFraction: true },
        { label: 'π', value: '\\pi' },
        { label: '÷', value: '/' },
        { label: '=', value: '=' },
        { label: '%', value: '%' },
        { label: 'e', value: 'e' },
        { label: '∆', value: '\\Delta' },
        { label: '∞', value: '\\infty' },
    ];

    const functionTabs = {
        'basico': { label: 'BÁSICO', buttons: basicMathButtons },
        'potencia': { 
            label: 'POTÊNCIA/RAIZ', 
            buttons: [
                { label: 'x²', value: '^{2}' },
                { label: 'xʸ', value: '^{ }' },
                { label: '³√x', value: '\\sqrt[3]{ }' },
                { label: '√x', value: '\\sqrt{ }' },
                { label: 'ⁿ√x', value: '\\sqrt[ ]{ }' },
                { label: '1/x', value: '^{-1}' },
            ]
        },
        'trigonometria': { 
            label: 'TRIGONOMETRIA', 
            buttons: [
                { label: 'sin', value: '\\sin { }' },
                { label: 'cos', value: '\\cos { }' },
                { label: 'tan', value: '\\tan { }' },
                { label: 'sin⁻¹', value: '\\sin^{-1} { }' },
                { label: 'cos⁻¹', value: '\\cos^{-1} { }' },
                { label: 'tan⁻¹', value: '\\tan^{-1} { }' },
            ]
        },
        'logexp': { 
            label: 'LOG/EXP', 
            buttons: [
                { label: 'ln', value: '\\ln { }' },
                { label: 'log', value: '\\log { }' },
                { label: 'eˣ', value: 'e^{ }' },
                { label: '10ˣ', value: '10^{ }' },
            ]
        },
        'estatcomb': {
            label: 'ESTAT/COMB',
            buttons: [
                { label: 'Σ', value: '\\sum_{ }^{ }' },
                { label: '∫', value: '\\int_{ }^{ }' },
                { label: '!', value: ' { } !' },
                { label: 'nCr', value: '\\binom{ }{ }' },
                { label: 'nPr', value: 'P_{ }^{ }' },
                { label: 'Avg', value: '\\bar{x}' },
                { label: 'Std', value: '\\sigma' },
                { label: 'Var', value: '\\sigma^{2}' },
            ]
        },
        'avancado': {
            label: 'AVANÇADO',
            buttons: [
                { label: 'd/dx', value: '\\frac{d}{d { } } { } ' },
                { label: 'lim', value: '\\lim_{ { } \\to { } }' },
                { label: 'Γ', value: '\\Gamma' },
                { label: 'erf', value: '\\operatorname{erf}' },
                { label: 'ζ', value: '\\zeta' },
                { label: 'floor', value: '\\lfloor \\rfloor' },
                { label: 'ceil', value: '\\lceil \\rceil' },
            ]
        },
        'matrizvetor': {
            label: 'MATRIZ/VETOR',
            buttons: [
                { label: 'T', value: '^T' },
                { label: 'det', value: 'det( { } )' },
                { label: 'inv', value: '^ {-1}' },
                { label: 'dot', value: '\\cdot' },
                { label: 'cross', value: '\\times' },
                { label: 'norm', value: '\\| { } \\|' },
            ]
        }
    };

    // O array formulaItems foi removido por ser não utilizado e fragmentado.

    // Categorias de fórmulas com mais conteúdo
    const formulaTabs = {
        'matematica': { label: 'Matemática Fundamental', items: [
            { label: 'Teorema de Pitágoras', latex: 'a^2+b^2=c^2' },
            { label: 'Fórmula de Bhaskara', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
            { label: 'Área do Círculo', latex: 'A = \\pi r^2' },
            { label: 'Identidade (a+b)²', latex: '(a+b)^2 = a^2 + 2ab + b^2' },
            { label: 'Logaritmo Mudança Base', latex: '\\log_b(x) = \\frac{\\log_a(x)}{\\log_a(b)}' },
            { label: 'Lei dos Cossenos', latex: 'c^2 = a^2 + b^2 - 2ab\\cos(\\gamma)' },
        ] },
        'fisica': { label: 'Física Geral', items: [
            { label: 'Lei da Gravitação Universal', latex: 'F=G\\frac{m_1 m_2}{r^2}' },
            { label: 'Energia (Massa-Energia)', latex: 'E=mc^2' },
            { label: 'Velocidade Média', latex: '\\bar{v} = \\frac{\\Delta s}{\\Delta t}' },
            { label: 'Conservação de Energia', latex: 'E_{cinética} + E_{potencial} = constante' },
        ] },
        'mecanica': { label: 'Mecânica Estrutural', items: [
            { label: 'Tensão Normal', latex: '\\sigma = \\frac{F}{A}' },
            { label: 'Tensão de Cisalhamento', latex: '\\tau = \\frac{V}{A}' },
            { label: 'Momento Fletor', latex: 'M=F\\cdot d' },
            { label: 'Módulo de Young (E)', latex: 'E = \\frac{\\sigma}{\\epsilon}' },
            { label: 'Momento de Inércia (Retângulo)', latex: 'I = \\frac{b h^3}{12}' },
        ] },
        'termo': { label: 'Termodinâmica', items: [
            { label: '1ª Lei Termodinâmica', latex: '\\Delta U = Q - W' },
            { label: 'Equação dos Gases Ideais', latex: 'PV = nRT' },
            { label: 'Condução Calor (Fourier)', latex: 'q = -k A \\frac{dT}{dx}' },
            { label: 'Eficiência de Carnot', latex: '\\eta_{Carnot} = 1 - \\frac{T_C}{T_H}' },
            { label: 'Vazão Mássica', latex: '\\dot{m} = \\rho A v' },
        ] },
        'eletrica': { label: 'Eletricidade & Eletrônica', items: [
            { label: "Lei de Ohm", latex: 'V=IR' },
            { label: 'Potência Elétrica', latex: 'P=VI' },
            { label: 'Potência (Versão 2)', latex: 'P = I^2 R' },
            { label: 'Capacitância', latex: 'Q = C V' },
            { label: 'Impedância (RLC)', latex: 'Z = R + j \\left(\\omega L - \\frac{1}{\\omega C}\\right)' },
        ] },
        'hidraulica': { label: 'Hidráulica & Fluidos', items: [
            { label: 'Equação da Continuidade', latex: 'Q = A v' },
            { label: 'Bernoulli (Energia)', latex: '\\frac{P}{\\gamma} + \\frac{v^2}{2g} + z = constante' },
            { label: 'Número de Reynolds', latex: 'Re = \\frac{\\rho v D}{\\mu}' },
            { label: 'Perda de Carga (Darcy)', latex: 'h_f = f \\frac{L}{D} \\frac{v^2}{2g}' },
        ] },
        'controle': { label: 'Controle & Sistemas', items: [
            { label: 'Função de Transferência', latex: 'G(s)=\\frac{Y(s)}{U(s)}' },
            { label: 'Resposta ao Degrau (1ª Ordem)', latex: 'y(t) = K \\left( 1 - e^{-t/\\tau} \\right) u(t)' },
            { label: 'Erro Regime Estacionário', latex: 'e_{ss} = \\lim_{s \\to 0} s E(s)' },
            { label: 'Ganho Proporcional (Kp)', latex: 'K_p = \\lim_{s \\to 0} G(s)' },
        ] },
        'calculo': { label: 'Cálculo Avançado', items: [
            { label: 'Regra da Cadeia', latex: '\\frac{dy}{dx} = \\frac{dy}{du} \\frac{du}{dx}' },
            { label: 'Integral por Partes', latex: '\\int u dv = uv - \\int v du' },
            { label: 'Teorema Fund. Cálculo', latex: '\\int_a^b f(x) dx = F(b) - F(a)' },
            { label: 'Série de Taylor', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n' },
        ] },
    };








// Bloco 2: Geração de HTML e Renderização Inicial (KaTeX)

    // --- 2. Geração de HTML ---

    let htmlContent = `
        <div class="functions-panel-container functions-panel-wrapper">
            <div class="main-tabs-header tabs-header">
                <button class="main-tab-button tab-button active" data-tab="funcoes">
                    <span class="material-icons-round">apps</span> Funções
                </button>
                <button class="main-tab-button tab-button" data-tab="formulas">
                    <span class="material-icons-round">description</span> Fórmulas
                </button>
            </div>

            <div class="main-tabs-content tabs-content">
                
                <div id="funcoes" class="main-tab-pane tab-pane active">
                    
                    <div class="sub-tabs-header tabs-header">
    `;
    
    let isFirstSubTab = true;
    for (const key in functionTabs) {
        const tab = functionTabs[key];
        const activeClass = isFirstSubTab ? ' active' : '';
        htmlContent += `<button class="tab-button sub-tab-button${activeClass}" data-tab="${key}">${tab.label}</button>`;
        isFirstSubTab = false;
    }

    htmlContent += `
                    </div> 
                    
                    <div class="sub-tabs-content">
    `;

    for (const key in functionTabs) {
        const tab = functionTabs[key];
        const activeClass = (key === 'basico') ? ' active' : '';
        
        htmlContent += `<div id="${key}" class="tab-pane sub-tab-pane${activeClass}">
                            <div class="functions-grid">`;
        
        tab.buttons.forEach(btn => {
            if (btn.isFraction) {
                htmlContent += `
                    <button class="func-btn fraction" data-value="${btn.value}">
                        <div class="fraction-icon">
                            <span>□</span>
                            <hr>
                            <span>□</span>
                        </div>
                    </button>`;
            } else {
                // render content via KaTeX when appropriate; prefer btn.value if it looks like LaTeX
                const texSource = btn.value;
                const encoded = encodeURIComponent(texSource);
                // AQUI: Os botões de função estão renderizando o KaTeX no HTML
                htmlContent += `<button class="func-btn" data-value="${btn.value}"><span class="func-render" data-latex="${encoded}"></span></button>`;
            }
        });

        htmlContent += `</div></div>`;
    }

    htmlContent += `
                    </div> 
                </div> 

                <div id="formulas" class="main-tab-pane tab-pane">
                    <div class="formula-pane">
                            <div class="formula-sub-tabs-header tabs-header">
        `;

        // gera botões das sub-abas de fórmula
        let isFirstFormulaTab = true;
        for (const key in formulaTabs) {
            const tab = formulaTabs[key];
            const activeClass = isFirstFormulaTab ? ' active' : '';
            htmlContent += `<button class="tab-button formula-sub-tab-button${activeClass}" data-tab="formula-${key}">${tab.label}</button>`;
            isFirstFormulaTab = false;
        }

        htmlContent += `</div>`;

        // gera conteúdo de cada sub-aba de fórmula
        for (const key in formulaTabs) {
            const tab = formulaTabs[key];
            const activeClass = key === Object.keys(formulaTabs)[0] ? ' active' : '';
            // uso do novo layout de cartão de fórmula (card)
            htmlContent += `<div id="formula-${key}" class="formula-sub-pane tab-pane${activeClass}" style="padding-top:12px;">`;
            // o formula-strip agora define o grid de 2 colunas
            htmlContent += `<div class="formula-strip">`;
            tab.items.forEach(item => {
                const encoded = encodeURIComponent(item.latex);
                htmlContent += `
                    <button class="formula-btn" data-formula="${item.latex}">
                        <div class="formula-title">${item.label}</div>
                        <span class="formula-render" data-latex="${encoded}"></span>
                    </button>`;
            });
            htmlContent += `</div></div>`;
        }

        htmlContent += `
                        </div>
                    </div>

            </div>
        </div>
    `;
    
    container.innerHTML = htmlContent;







// Bloco 3: Carregamento e Renderização KaTeX

    // Função para carregar KaTeX dinamicamente se necessário e renderizar LaTeX
    const loadKaTeX = () => {
        return new Promise((resolve, reject) => {
            if (window.katex) return resolve(window.katex);

            // carregar CSS
            const katexCssHref = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
            if (!document.querySelector(`link[href="${katexCssHref}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = katexCssHref;
                document.head.appendChild(link);
            }

            // carregar script
            const katexJs = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
            // CORREÇÃO CRÍTICA: Garante que o script seja carregado apenas uma vez
            if (!document.querySelector(`script[src="${katexJs}"]`)) {
                const script = document.createElement('script');
                script.src = katexJs;
                script.onload = () => {
                    if (window.katex) resolve(window.katex);
                    else reject(new Error('KaTeX carregado, mas não disponível'));
                };
                script.onerror = () => reject(new Error('Falha ao carregar KaTeX'));
                document.head.appendChild(script);
            } else {
                // Se o script já foi injetado (mas talvez não tenha carregado), aguarda
                const waitForKatex = () => {
                    if (window.katex) return resolve(window.katex);
                    setTimeout(waitForKatex, 50);
                };
                waitForKatex();
            }
        });
    };

    const renderTeXElements = () => {
        const nodes = container.querySelectorAll('.formula-render, .func-render');
        if (!nodes.length) return;
        loadKaTeX().then(katex => {
            nodes.forEach(n => {
                const latex = decodeURIComponent(n.getAttribute('data-latex') || '');
                try {
                    katex.render(latex, n, { throwOnError: false, displayMode: false });
                } catch (e) {
                    n.textContent = latex; // fallback
                }
            });
        }).catch(() => {
            // fallback para texto cru
            nodes.forEach(n => n.textContent = decodeURIComponent(n.getAttribute('data-latex') || ''));
        });
    };

    // renderiza imediatamente (tentará carregar KaTeX se necessário)
    renderTeXElements();






    

// Bloco 4: Interatividade e Listeners de Eventos

    // --- 3. Interatividade ---

    const insertValue = (value) => {
        const handler = typeof onInsert === 'function'
            ? onInsert
            : window.nexusInsertSymbol;
        if (typeof handler === 'function') {
            handler(value);
        }
    };
    
    const mainTabButtons = container.querySelectorAll('.main-tab-button');
    mainTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            
            mainTabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            container.querySelectorAll('.main-tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    const subTabButtons = container.querySelectorAll('.sub-tab-button');
    subTabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            container.querySelectorAll('.sub-tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Listeners para sub-abas de Fórmulas
    const formulaSubTabButtons = container.querySelectorAll('.formula-sub-tab-button');
    if (formulaSubTabButtons.length) {
        formulaSubTabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-tab');
                formulaSubTabButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                container.querySelectorAll('.formula-sub-pane').forEach(pane => pane.classList.remove('active'));
                const target = container.querySelector('#' + targetId);
                if (target) target.classList.add('active');
            });
        });
    }

    container.querySelectorAll('.func-btn').forEach(button => {
        button.addEventListener('click', function() {
            insertValue(this.getAttribute('data-value'));
        });
    });

    container.querySelectorAll('.formula-btn').forEach(button => {
        button.addEventListener('click', function() {
            insertValue(this.getAttribute('data-formula'));
        });
    });
}