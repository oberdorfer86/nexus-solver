// /apps/nexus-core/static/js/core-main.js

// Bloco 1: Inicialização e Constantes Globais
window.addEventListener("DOMContentLoaded", () => {
    console.log(">>> NEXUS Platform JS (updated) Initialized <<<");

    const body = document.body;
    const getEl = (id) => document.getElementById(id);
    const qs = (sel) => document.querySelector(sel);
    const qsa = (sel) => Array.from(document.querySelectorAll(sel));

    // Toggles / elementos chave
    const themeBtn = getEl('theme-toggle-btn');
    const menuToggle = getEl('menu-toggle');
    const sidebar = getEl('app-sidebar');

    // Search related
    const sidebarSearchInput = getEl('sidebar-search-input');
    const sidebarToolsList = getEl('sidebar-tools-list');

    // Feedback related
    const feedbackText = getEl('feedback-text');
    const feedbackEmail = getEl('feedback-email');
    const feedbackSendBtn = getEl('feedback-send-btn');
    const feedbackResult = getEl('feedback-result');

    // Breakpoint Mobile (igual CSS)
    const MOBILE_BREAKPOINT = 900;

    function addClassSafe(el, cls) { if(el && !el.classList.contains(cls)) el.classList.add(cls); }
    function removeClassSafe(el, cls) { if(el && el.classList.contains(cls)) el.classList.remove(cls); }
    function toggleClassSafe(el, cls) { if(el) el.classList.toggle(cls); }
    function debounce(fn, wait = 250) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // =====================================================================================
    // Bloco 2: Tema Light/Dark (mantém comportamento atual)
    if (themeBtn) {
        const html = document.documentElement;
        const savedTheme = localStorage.getItem('nexus_theme');
        const initialTheme = savedTheme || html.getAttribute('data-theme') || 'light';
        html.setAttribute('data-theme', initialTheme);
        const iconSpan = themeBtn.querySelector('span');
        if (iconSpan) iconSpan.textContent = initialTheme === 'light' ? 'dark_mode' : 'light_mode';

        themeBtn.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', nextTheme);
            localStorage.setItem('nexus_theme', nextTheme);
            if (iconSpan) iconSpan.textContent = nextTheme === 'light' ? 'dark_mode' : 'light_mode';
        });
    }

    // =====================================================================================
    // Bloco 3: Sidebar Mobile Drawer + Toggle
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
            const span = menuToggle.querySelector('span');
            if (span) span.textContent = sidebar.classList.contains('open') ? 'close' : 'menu';
        });

        // Fechar sidebar ao clicar fora (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= MOBILE_BREAKPOINT && sidebar.classList.contains('open')) {
                const clickedInside = sidebar.contains(e.target);
                const clickedToggle = menuToggle.contains(e.target);
                if (!clickedInside && !clickedToggle) {
                    sidebar.classList.remove('open');
                    const span = menuToggle.querySelector('span');
                    if (span) span.textContent = 'menu';
                }
            }
        });

        // Garantir que no resize > mobile, sidebar volte ao estado normal
        window.addEventListener('resize', () => {
            if (window.innerWidth > MOBILE_BREAKPOINT) {
                sidebar.classList.remove('open');
                const span = menuToggle.querySelector('span');
                if (span) span.textContent = 'menu';
            }
        });
    }

    // =====================================================================================
    // Bloco 4: Ajustes de layout extra
    function adjustMainPadding() {
        const main = document.querySelector('.main-content');
        if (!main) return;
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            addClassSafe(body, 'with-sidebar-open');
        } else {
            removeClassSafe(body, 'with-sidebar-open');
        }
    }
    adjustMainPadding();
    window.addEventListener('resize', adjustMainPadding);

    // =====================================================================================
    // Bloco 5: Busca dinâmica na Sidebar (client-side filtering)
    // - Usa data-name nos links para procurar por palavras-chaves
    // - Debounced input para performance

    function normalizeText(s) {
        if (!s) return '';
        return s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function filterSidebarTools(query) {
        if (!sidebarToolsList) return;
        const q = normalizeText(query || '');
        const items = qsa('#sidebar-tools-list .nav-link');
        let visibleCount = 0;

        items.forEach(item => {
            const nameAttr = item.getAttribute('data-name') || '';
            const label = normalizeText(nameAttr + ' ' + (item.textContent || ''));
            // match if all query tokens present (AND)
            const tokens = q.split(/\s+/).filter(Boolean);
            const matched = tokens.length === 0 || tokens.every(t => label.includes(t));
            if (matched) {
                item.style.display = ''; // show
                visibleCount += 1;
            } else {
                item.style.display = 'none'; // hide
            }
        });

        // Optional: show a “no results” item if none match
        let noResultEl = sidebarToolsList.querySelector('.no-result-item');
        if (!noResultEl) {
            noResultEl = document.createElement('div');
            noResultEl.className = 'no-result-item';
            noResultEl.style.padding = '12px';
            noResultEl.style.color = 'var(--text-muted)';
            noResultEl.style.fontSize = '0.95rem';
            sidebarToolsList.appendChild(noResultEl);
        }
        noResultEl.textContent = visibleCount === 0 ? 'Nenhuma ferramenta encontrada. Deseja sugerir uma?' : '';
        noResultEl.style.display = visibleCount === 0 ? '' : 'none';
    }

    if (sidebarSearchInput) {
        const onInput = debounce(() => {
            filterSidebarTools(sidebarSearchInput.value);
        }, 180);
        sidebarSearchInput.addEventListener('input', onInput);

        // support ESC to clear quickly
        sidebarSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                sidebarSearchInput.value = '';
                filterSidebarTools('');
                sidebarSearchInput.blur();
            }
        });
    }

    // Run once to ensure initial state is not filtered
    filterSidebarTools('');

    // =====================================================================================
    // Bloco 6: Envio de feedback (sugestões) - client-side
    // - Envia POST JSON para /api/feedback
    // - fallback: simula sucesso se endpoint não existir (graceful)

    async function sendFeedback(payload) {
        // try to POST; if fails (404/Network), fallback to simulated success
        try {
            const resp = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!resp.ok) {
                // for non-2xx, try to parse error message
                let text;
                try { text = await resp.text(); } catch (e) { text = resp.statusText; }
                throw new Error(text || `Erro: ${resp.status}`);
            }

            return { ok: true, data: await resp.json() };
        } catch (err) {
            // If server endpoint not available, fallback to "local success" and log error
            console.warn('Feedback POST failed (fallback):', err);
            return { ok: false, error: err.message || 'network error' };
        }
    }

    function validateEmail(email) {
        if (!email) return true; // optional
        // simple regex for basic validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (feedbackSendBtn) {
        feedbackSendBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!feedbackText) return;
            const text = (feedbackText.value || '').trim();
            const email = (feedbackEmail && feedbackEmail.value) ? feedbackEmail.value.trim() : '';

            // Basic validation
            if (!text) {
                if (feedbackResult) {
                    feedbackResult.textContent = 'Por favor, escreva sua sugestão antes de enviar.';
                    feedbackResult.style.color = 'var(--danger)';
                }
                return;
            }
            if (!validateEmail(email)) {
                if (feedbackResult) {
                    feedbackResult.textContent = 'E-mail inválido.';
                    feedbackResult.style.color = 'var(--danger)';
                }
                return;
            }

            // Disable button to prevent multiple sends
            feedbackSendBtn.disabled = true;
            feedbackSendBtn.style.opacity = '0.6';
            if (feedbackResult) {
                feedbackResult.textContent = 'Enviando...';
                feedbackResult.style.color = 'var(--text-muted)';
            }

            const payload = {
                text,
                email: email || null,
                path: window.location.pathname,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            const result = await sendFeedback(payload);

            // Re-enable button
            feedbackSendBtn.disabled = false;
            feedbackSendBtn.style.opacity = '';

            if (result.ok) {
                // success path
                if (feedbackResult) {
                    feedbackResult.textContent = 'Obrigado! Sua sugestão foi registrada.';
                    feedbackResult.style.color = 'var(--primary)';
                }
                // clear inputs
                feedbackText.value = '';
                if (feedbackEmail) feedbackEmail.value = '';
                // small success animation (if style exists)
                addClassSafe(feedbackSendBtn, 'sent');
                setTimeout(() => removeClassSafe(feedbackSendBtn, 'sent'), 1200);
            } else {
                // server fallback or error
                if (feedbackResult) {
                    feedbackResult.textContent = 'Ocorreu um problema ao enviar. Tente novamente mais tarde.';
                    feedbackResult.style.color = 'var(--danger)';
                }
            }
        });
    }

    // Bloco 7: Acessibilidade e pequenos comportamentos UX
    // - permite focar o input de busca quando o usuário pressiona "/" (slash)
    // - permite fechar sidebar com ESC em mobile

    document.addEventListener('keydown', (e) => {
        // CRÍTICO: Adiciona 'MATH-FIELD' à lista de tags ignoradas para que o atalho /
        // não desvie o foco da calculadora quando o usuário estiver digitando.
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'MATH-FIELD')) return;

        if (e.key === '/') {
            if (sidebarSearchInput) {
                e.preventDefault();
                sidebarSearchInput.focus();
                sidebarSearchInput.select && sidebarSearchInput.select();
            }
        } else if (e.key === 'Escape') {
            // if mobile and sidebar open, close it
            if (window.innerWidth <= MOBILE_BREAKPOINT && sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                if (menuToggle) {
                    const span = menuToggle.querySelector('span');
                    if (span) span.textContent = 'menu';
                }
            }
        }
    });

    // =====================================================================================
    // Bloco 8: Small utilities (highlight matched substrings in visible items)
    // - optional: visually highlight tokens typed in search
    function highlightMatches(query) {
        const tokens = normalizeText(query || '').split(/\s+/).filter(Boolean);
        const items = qsa('#sidebar-tools-list .nav-link');
        items.forEach(item => {
            // restore original text
            const raw = item.getAttribute('data-original-text');
            let textNode;
            if (!raw) {
                const labelText = item.textContent.trim();
                item.setAttribute('data-original-text', labelText);
                textNode = labelText;
            } else {
                textNode = raw;
            }
            if (tokens.length === 0) {
                // remove highlights
                item.innerHTML = `<span class="material-icons-round">${item.querySelector('.material-icons-round')?.textContent || ''}</span> ${item.getAttribute('data-original-text') || ''}`;
                return;
            }

            // produce highlighted html
            let html = item.getAttribute('data-original-text') || item.textContent;
            let safeHtml = html;
            tokens.forEach(token => {
                if (!token) return;
                const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
                safeHtml = safeHtml.replace(re, (match) => `<mark class="sidebar-highlight">${match}</mark>`);
            });

            // keep icon intact (rebuild)
            const icon = item.querySelector('.material-icons-round')?.textContent || '';
            item.innerHTML = `<span class="material-icons-round">${icon}</span> ${safeHtml}`;
        });
    }

    // Hook highlight to input (debounced)
    if (sidebarSearchInput) {
        const onHighlight = debounce(() => {
            highlightMatches(sidebarSearchInput.value);
        }, 200);
        sidebarSearchInput.addEventListener('input', onHighlight);
    }

    // =====================================================================================
    // Bloco 9: Graceful degrade / feature detect and telemetry (optional)
    // If fetch/ES6 features not available, keep UI functional without filtering or feedback

    // feature detection (very simple)
    const supportsFetch = typeof fetch === 'function';
    if (!supportsFetch && feedbackSendBtn) {
        feedbackSendBtn.disabled = true;
        if (feedbackResult) {
            feedbackResult.textContent = 'Envio de sugestões não suportado neste navegador.';
            feedbackResult.style.color = 'var(--text-muted)';
        }
    }

    // End of DOMContentLoaded
});
