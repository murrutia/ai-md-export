// ==UserScript==
// @name        (ChatGPT) AI markdown export
// @namespace   http://tampermonkey.net/
// @version     0.1
// @description Ajoute un bouton pour exporter la conversation de Gemini en Markdown.
// @author      Mickael Urrutia
// @match       https://chatgpt.com/*
// @require     file:///Users/murrutia/src/sandbox/ai-md-export/chatgpt-export.js
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    const btn_id = 'markdown-export-btn';
    const toolbar_selector = '[data-testid="composer-footer-actions"]';

    async function getMarkdownFromBubble(bubble) {

        // Place le bloc vers le haut du viewport
        bubble.scrollIntoView();
        await new Promise(resolve => setTimeout(resolve, 100));

        const copyButton = bubble.querySelector('[data-testid=copy-turn-action-button]');
        // Ici, copyButton est vide si je n'ai pas passé ma souris sur la bulle de discussion associée au préalable
        if (copyButton) {
            copyButton.click();

            // Délai pour que le contenu soit copié dans le presse-papier
            await new Promise(resolve => setTimeout(resolve, 50));

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
        const conversation_title = document.title;
        let markdownContent = `# ChatGPT - ${conversation_title}`;

        const chatBubbles = document.querySelectorAll('[class^="group/conversation-turn"]');
        chatBubbles[0].scrollIntoView({ behavior: "smooth" })
        await new Promise(resolve => setTimeout(resolve, 1000));

        for (const bubble of chatBubbles) {
            const markdown = await getMarkdownFromBubble(bubble);

            if (bubble.classList.contains("agent-turn")) {
                markdownContent += `\n\n## Réponse\n\n${markdown}`;
            } else {
                markdownContent += `\n\n## Question\n\n${markdown}`;
            }
        }

        // Créer un lien de téléchargement
        const now = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        const filename = `ChatGPT - ${conversation_title} (${now}).md`;
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

    function showMouseTriggerZone(startCallback) {
        const header_rect = document.getElementById('page-header').getBoundingClientRect()
        const bubble_rect = document.querySelector('[class^="group/conversation-turn"]').getBoundingClientRect()

        const zone = document.createElement('div');
        zone.id = 'mouse-trigger-zone';
        zone.style.position = 'fixed';
        zone.style.left = bubble_rect.left+'px';
        zone.style.top = (header_rect.height - 20 )+'px';
        zone.style.width = bubble_rect.width+'px';
        zone.style.height = '80px';
        zone.style.backgroundColor = 'rgba(155, 155, 155, 0.3)';
        zone.style.color = 'white';
        zone.style.borderRadius = '28px';
        zone.style.fontSize = '18px';
        zone.style.display = 'flex';
        zone.style.transition = 'opacity 0.6s ease';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';
        zone.style.zIndex = '9999';
        zone.style.cursor = 'pointer';
        zone.textContent = '🖱️ Placez votre souris ici pour lancer l’export Markdown…';

        document.body.appendChild(zone);

        // Ajout du handler d'annulation du process et des événements observés (clic ou touche escape)
        const cancelHandler = () => {
            cleanup();
            console.log("Export annulé.");
        };

        function cleanup() {
            document.removeEventListener('keydown', escListener);
            document.removeEventListener('click', clickListener);
            if (zone && zone.parentNode) {
                zone.parentNode.removeChild(zone);
            }
        }

        const escListener = (e) => {
            if (e.key === 'Escape') cancelHandler();
        };
        const clickListener = (e) => {
            if (!zone.contains(e.target)) cancelHandler();
        };

        document.addEventListener('keydown', escListener);
        setTimeout(listener => document.addEventListener('click', listener), 50, clickListener);

        // Action lorsque la souris entre dans la zone : on enlève la zone et on active le processus
        const trigger = async () => {
            zone.removeEventListener('mouseenter', trigger);
            // Démarrage du fondu
            zone.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 600));
            document.body.removeChild(zone);
            startCallback();
        };

        zone.addEventListener('mouseenter', trigger);
    }

    function addExportButton() {
        if (document.getElementById(btn_id)) {
            return;
        }
        const toolbar = document.querySelector(toolbar_selector);
        const btn = document.createElement('button');
        btn.id = btn_id;
        btn.textContent = 'Exporter en Markdown !';
        btn.style.color = 'rgb(154, 155, 156)';
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0)';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        btn.style.borderRadius = '28px';
        btn.style.marginLeft = '10px';
        btn.style.padding = '10px 20px';
        btn.style.cursor = 'pointer';
        // btn.addEventListener('click', exportConversation);
        btn.addEventListener('click', () => {
            showMouseTriggerZone(exportConversation);
        });
        toolbar.appendChild(btn);
    }

    // On va observer le conteneur parent de la toolbar et vérifier régulièrement si la toolbar apparaît
    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.querySelector(toolbar_selector)) {
            // Visiblement la toolbar est modifiée pendant le chargeent, donc on attend qu'elle soit stabilisée avant d'ajouter le bouton
            setTimeout(addExportButton, 1000);
            // Si la toolbar est trouvée et le bouton ajouté, on peut arrêter l'observation
            observer.disconnect();
        }
    });
    // Commence l'observation du parent avec l'option 'subtree' pour observer également les descendants
    observer.observe(document.body, { childList: true, subtree: true });
})();