// ============================================================================
// NEXUS Platform — Sidebar Controller
// Path: /apps/nexus-core/static/js/sidebar.js
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {

    console.log(">>> Sidebar.js carregado <<<");

    const searchInput = document.getElementById("sidebar-search");
    const toolItems = document.querySelectorAll(".tool-item");
    const categories = document.querySelectorAll(".tools-category");

    const feedbackInput = document.getElementById("sidebar-feedback-input");
    const feedbackBtn = document.getElementById("sidebar-feedback-btn");

    const notifyInput = document.getElementById("sidebar-notify-input");
    const notifyBtn = document.getElementById("sidebar-notify-btn");

    // =========================================================================
    // 1) BUSCA E FILTRO CLIENT-SIDE
    // =========================================================================

    function filterTools() {
        const query = searchInput.value.toLowerCase().trim();

        toolItems.forEach(item => {
            const label = item.dataset.label.toLowerCase();
            const category = item.closest(".tools-category");

            // Mostra item se bater com a busca
            const visible = label.includes(query);
            item.style.display = visible ? "flex" : "none";

            // Após filtrar, verifique se a categoria inteira deve aparecer
            const anyVisible = [...category.querySelectorAll(".tool-item")]
                .some(i => i.style.display !== "none");

            category.style.display = anyVisible ? "block" : "none";
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterTools);
    }

    // =========================================================================
    // 2) FEEDBACK DO PROFISSIONAL (mock)
    // =========================================================================

    if (feedbackBtn) {
        feedbackBtn.addEventListener("click", () => {
            const text = feedbackInput.value.trim();

            if (!text) {
                alert("Por favor, escreva algo que sente falta na plataforma.");
                return;
            }

            console.log(">>> Feedback enviado:", text);

            feedbackInput.value = "";
            alert("Obrigado! Seu feedback foi registrado.");
        });
    }

    // =========================================================================
    // 3) OPT-IN PARA RECEBER NOVIDADES (mock)
    // =========================================================================

    if (notifyBtn) {
        notifyBtn.addEventListener("click", () => {
            const email = notifyInput.value.trim();

            if (!email || !email.includes("@")) {
                alert("Digite um e-mail válido.");
                return;
            }

            console.log(">>> Opt-in registrado:", email);

            notifyInput.value = "";
            alert("Você receberá novidades da plataforma NEXUS!");
        });
    }

});

