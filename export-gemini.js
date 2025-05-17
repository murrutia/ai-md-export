// ==UserScript==
// @name        (gemini) AI markdown export
// @namespace   http://tampermonkey.net/
// @version     0.1
// @description Ajoute un bouton pour exporter la conversation de Gemini en Markdown.
// @author      Mickael Urrutia
// @match       https://gemini.google.com/*
// @require     file:///Users/murrutia/src/sandbox/ai-md-export/gemini-export.js
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    const btn_id = 'markdown-export-btn';
    const toolbar_selector = '.leading-actions-wrapper';

    async function getMarkdownFromBubble(bubble) {
        const moreMenuButton = bubble.querySelector('[data-test-id="more-menu-button"]');

        if (moreMenuButton) {
            moreMenuButton.click();
            // Délai nécessaire pour que le menu s'ouvre et que le bouton de copie soit cliquable
            await new Promise(resolve => setTimeout(resolve, 100));
            const copyButton = document.querySelector('[data-test-id="copy-button"]');
            copyButton.click();

            // Délai pour que le contenu soit copié dans le presse-papier
            await new Promise(resolve => setTimeout(resolve, 100));

            try {
                return await navigator.clipboard.readText();
            } catch (error) {
                console.error("Erreur lors de la lecture du presse-papier :", error);
                // Fallback si la lecture du presse-papier échoue (permissions, etc.)
                return bubble.innerText;
            }
        } else {
            return bubble.innerText; // Si les boutons ne sont pas trouvés, on récupère le texte brut
        }
    }

    async function exportConversation() {
        const conversation_title = document.querySelector('.conversation-title').innerText;
        let markdownContent = `# Gemini - ${conversation_title}`;
        const chatBubbles = document.querySelectorAll('user-query, model-response');

        for (const bubble of chatBubbles) {
            if (bubble.tagName === "USER-QUERY") {
                let text = bubble.innerText.replaceAll('\n\n', '\n');
                markdownContent += `\n\n## Question\n\n${text}`;
            } else {
                const markdown = await getMarkdownFromBubble(bubble);
                markdownContent += `\n\n## Réponse\n\n${markdown}`;
            }
        }

        // Créer un lien de téléchargement
        const now = (new Date())
            .toLocaleString("fr-FR", { timeZone: 'UTC' })
            .replaceAll('/', '-')
            .replaceAll(':', '-');
        const filename = `Gemini - ${conversation_title} (${now}).md`;
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }

    function addExportButton() {
        if (document.getElementById(btn_id)) {
            return;
        }
        const toolbar = document.querySelector(toolbar_selector);
        const btn = document.createElement('button');
        btn.id = btn_id;
        btn.textContent = 'Exporter en Markdown';
        btn.style.color = 'rgb(154, 155, 156)';
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0)';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        btn.style.borderRadius = '28px';
        btn.style.marginLeft = '10px';
        btn.style.padding = '10px 20px';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', exportConversation);
        toolbar.appendChild(btn);
    }

    // On va observer le conteneur parent de la toolbar et vérifier régulièrement si la toolbar apparaît
    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.querySelector(toolbar_selector)) {
            addExportButton();
            // Si la toolbar est trouvée et le bouton ajouté, on peut arrêter l'observation
            observer.disconnect();
        }
    });
    // Commence l'observation du parent avec l'option 'subtree' pour observer également les descendants
    observer.observe(document.body, { childList: true, subtree: true });
})();