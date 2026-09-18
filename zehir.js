(async function() {
    // 1. LİSANS DOĞRULAMA AYARLARI
    const GITHUB_USER = "iperendi"; // <-- Sadece burayı değiştir
    const REPO_NAME = "zehir-assistant";
    const LICENSE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/main/licenses.json?t=` + Date.now();

    let userKey = localStorage.getItem('zehir_license_key');
    if (!userKey) {
        userKey = prompt("⚡ ZEHİR AUTO SNİPE\nLütfen Lisans Anahtarınızı Giriniz:");
        if (userKey) {
            localStorage.setItem('zehir_license_key', userKey.trim());
        }
    }

    if (!userKey) {
        alert("Lisans anahtarı girilmedi! Bot çalıştırılamaz.");
        return;
    }

    try {
        const response = await fetch(LICENSE_URL);
        const data = await response.json();

        if (!data.active_licenses || !data.active_licenses.includes(userKey.trim())) {
            localStorage.removeItem('zehir_license_key');
            alert("❌ GEÇERSİZ VEYA SÜRESİ DOLMUŞ LİSANS!\nErişiminiz iptal edilmiştir.");
            return;
        }
    } catch (e) {
        alert("Lisans sunucusuna bağlanılamadı. İnternet bağlantınızı veya GitHub linkinizi kontrol edin.");
        return;
    }

    // Zaten açıksa ikinci kez çalıştırma
    if (window.zehirSniperLoaded) {
        alert("Zehir Snipe zaten sayfada aktif!");
        return;
    }
    window.zehirSniperLoaded = true;

    console.log("⚡ ZEHİR AUTO SNİPE: Lisans Onaylandı, Sistem Başlatılıyor...");

    // 2. SNIPER VE ARAYÜZ MOTORU
    let isSniperActive = false;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.bottom = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function injectVisualPanel() {
        if (document.getElementById('fc27-visual-helper-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'fc27-visual-helper-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '90px';
        panel.style.left = '15px';
        panel.style.zIndex = '999999';
        panel.style.backgroundColor = 'rgba(15, 15, 25, 0.96)';
        panel.style.border = '2px solid #00ffcc';
        panel.style.borderRadius = '10px';
        panel.style.padding = '12px';
        panel.style.boxShadow = '0 6px 20px rgba(0,0,0,0.8)';
        panel.style.color = '#ffffff';
        panel.style.fontFamily = 'Segoe UI, Arial, sans-serif';
        panel.style.fontSize = '12px';
        panel.style.width = '220px';
        panel.style.userSelect = 'none';

        panel.innerHTML = `
            <div id="zehirPanelHeader" style="font-weight: bold; margin-bottom: 8px; text-align: center; color: #00ffcc; border-bottom: 1px solid #333; padding-bottom: 5px; font-size: 13px; letter-spacing: 0.5px; cursor: move;">
                ⚡ ZEHİR AUTO SNİPE ⚡
            </div>
            
            <div style="margin-bottom: 6px;">
                <label for="botSpeed" style="display:block; margin-bottom:2px; font-weight:bold;">Arama Hızı:</label>
                <select id="botSpeed" style="width: 100%; padding: 4px; background: #222; color: #fff; border: 1px solid #00ffcc; border-radius: 4px;">
                    <option value="1000">1 Saniye (Hızlı)</option>
                    <option value="2000" selected>2 Saniye (İdeal)</option>
                    <option value="3000">3 Saniye (Stabil)</option>
                </select>
            </div>

            <div style="margin-bottom: 8px;">
                <label for="stopPriceInput" style="display:block; margin-bottom:2px; font-weight:bold;">Stop / Tavan Teklif:</label>
                <input type="number" id="stopPriceInput" value="1000" step="50" style="width: 93%; padding: 4px; background: #222; color: #00ffcc; border: 1px solid #00ffcc; border-radius: 4px; font-weight:bold;" />
            </div>

            <button id="toggleSniperBtn" style="width: 100%; padding: 8px; background-color: #00ffcc; color: #000; font-weight: bold; border: none; border-radius: 5px; cursor: pointer;">Botu Başlat</button>
        `;

        document.body.appendChild(panel);
        document.getElementById('toggleSniperBtn').addEventListener('click', toggleSniper);
        makeDraggable(panel, document.getElementById('zehirPanelHeader'));
    }

    function triggerNativeClick(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const eventParams = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        };

        element.dispatchEvent(new PointerEvent('pointerdown', eventParams));
        element.dispatchEvent(new MouseEvent('mousedown', eventParams));
        element.dispatchEvent(new PointerEvent('pointerup', eventParams));
        element.dispatchEvent(new MouseEvent('mouseup', eventParams));
        element.dispatchEvent(new MouseEvent('click', eventParams));
    }

    function getNextBidStep(currentVal) {
        if (currentVal < 1000) return currentVal + 50;
        if (currentVal < 10000) return currentVal + 100;
        if (currentVal < 50000) return currentVal + 250;
        if (currentVal < 100000) return currentVal + 500;
        return currentVal + 1000;
    }

    function stepMinBidPrice(stopLimit) {
        const filterView = document.querySelector('.ut-market-search-filters-view, .UTMarketSearchFiltersView');
        if (!filterView) return;

        const pricePickers = filterView.querySelectorAll('.ut-numeric-input-spinner-control');
        if (!pricePickers || pricePickers.length === 0) return;

        const minBidContainer = pricePickers[0];
        const input = minBidContainer.querySelector('input');
        const plusBtn = minBidContainer.querySelector('button.btn-sub.increment, button.increment, .increment');

        if (!input) return;

        let currentVal = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;
        let targetVal = 150;

        if (currentVal >= stopLimit) {
            targetVal = 150;
        } else {
            targetVal = getNextBidStep(currentVal);
        }

        if (targetVal !== 150 && plusBtn) {
            triggerNativeClick(plusBtn);
        } else {
            input.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, targetVal.toString());
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
        }
    }

    function updateSniperUI(active) {
        const btn = document.getElementById('toggleSniperBtn');
        if (!btn) return;
        if (active) {
            btn.innerText = "Botu Durdur";
            btn.style.backgroundColor = "#ff5555";
            btn.style.color = "#fff";
        } else {
            btn.innerText = "Botu Başlat";
            btn.style.backgroundColor = "#00ffcc";
            btn.style.color = "#000";
        }
    }

    async function toggleSniper() {
        if (isSniperActive) {
            isSniperActive = false;
            updateSniperUI(false);
            console.log("Sniper Bot Durduruldu.");
        } else {
            isSniperActive = true;
            updateSniperUI(true);
            console.log("Sniper Bot Başlatıldı!");
            runSmartSniperFlow();
        }
    }

    function findModalConfirmButton() {
        const allButtons = document.querySelectorAll('.ea-dialog-view button, .ut-modal-dialog-view button, .dialog-body button');
        for (let btn of allButtons) {
            const txt = btn.innerText.trim().toLowerCase();
            if (txt === 'tamam' || txt === 'ok' || txt === 'yes') {
                return btn;
            }
        }
        return null;
    }

    function findBuyNowButton() {
        const splitView = document.querySelector('.ut-split-view, .ut-quick-list-panel-view');
        const container = splitView || document;
        const buttons = container.querySelectorAll('button');

        for (let btn of buttons) {
            const txt = btn.innerText.toLowerCase();
            if (txt.includes('hemen al') || txt.includes('buy now')) {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return btn;
                }
            }
        }
        return null;
    }

    async function runSmartSniperFlow() {
        while (isSniperActive) {
            const speedSelect = document.getElementById('botSpeed');
            const stopInput = document.getElementById('stopPriceInput');
            const delayMs = speedSelect ? parseInt(speedSelect.value) : 2000;
            const stopLimit = stopInput ? parseInt(stopInput.value) || 1000 : 1000;

            const dialogErrorBtn = document.querySelector('.ea-dialog-view--body button:not(.call-to-action), .dialog-body button.btn-standard:not(.call-to-action)');
            if (dialogErrorBtn && dialogErrorBtn.getBoundingClientRect().width > 0) {
                triggerNativeClick(dialogErrorBtn);
                await sleep(200);
            }

            const searchForm = document.querySelector('.UTMarketSearchFiltersView, .ut-market-search-filters-view');
            const resultsView = document.querySelector('.UTMarketSearchResultsView, .ut-market-search-results-view');
            const noResultsMsg = document.querySelector('.ut-no-results-view');
            const headerTitle = document.querySelector('.ut-navigation-bar-view .title');
            const isResultsScreen = (headerTitle && headerTitle.innerText.includes('Arama Sonuçları')) || resultsView || noResultsMsg;

            if (isResultsScreen && (!searchForm || searchForm.offsetParent === null)) {
                const cards = document.querySelectorAll('.paginated-item-list .listFUTItem, .ut-pinned-list-container .listFUTItem');

                if (cards.length > 0) {
                    const firstCard = cards[0];
                    if (!firstCard.classList.contains('selected')) {
                        triggerNativeClick(firstCard);
                    }

                    let buyNowBtn = null;
                    for (let i = 0; i < 20; i++) {
                        buyNowBtn = findBuyNowButton();
                        if (buyNowBtn) break;
                        await sleep(30);
                    }

                    if (buyNowBtn) {
                        triggerNativeClick(buyNowBtn);

                        let confirmClicked = false;
                        for (let i = 0; i < 25; i++) {
                            const confirmBtn = findModalConfirmButton();
                            if (confirmBtn && confirmBtn.getBoundingClientRect().width > 0) {
                                triggerNativeClick(confirmBtn);
                                confirmClicked = true;
                                break;
                            }
                            await sleep(25);
                        }

                        if (confirmClicked) {
                            await sleep(1000);
                            isSniperActive = false;
                            updateSniperUI(false);

                            const shouldContinue = window.confirm("Kart için satın alma işlemi yapıldı!\n\nAramaya devam edilsin mi?");
                            if (shouldContinue) {
                                isSniperActive = true;
                                updateSniperUI(true);
                            } else {
                                break;
                            }
                        }
                    }
                }

                const backBtn = document.querySelector('.ut-navigation-bar-view .ut-navigation-button-control');
                if (backBtn) {
                    triggerNativeClick(backBtn);
                    await sleep(700);

                    if (!isSniperActive) break;

                    stepMinBidPrice(stopLimit);
                    await sleep(350);
                    continue;
                }
            }

            if (searchForm && searchForm.offsetParent !== null) {
                const searchBtn = Array.from(searchForm.querySelectorAll('button')).find(b => {
                    const txt = b.innerText.trim().toLowerCase();
                    return txt === 'ara' || txt === 'search';
                });

                if (searchBtn && searchBtn.offsetParent !== null) {
                    triggerNativeClick(searchBtn);
                    await sleep(delayMs);
                    continue;
                }
            }

            await sleep(300);
        }
    }

    injectVisualPanel();
})();
