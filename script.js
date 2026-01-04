// ============================================================
// ⚙️ CONFIGURAZIONE & VARIABILI GLOBALI
// ============================================================
const GOOGLE_SCRIPT_URL = typeof API_URL !== 'undefined' ? API_URL : "INSERISCI_URL_SE_NON_USI_CONFIG_JS"; 
let adminPassword = ""; 

// ============================================================
// 🚀 AVVIO & LOGIN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Controlla sessione salvata
    const savedPass = sessionStorage.getItem('adminPass');
    if (savedPass) {
        adminPassword = savedPass;
        fetchOrders(true);
    }
    
    // 2. SETUP DATE INTELLIGENTE (Martedì / Venerdì)
    const today = new Date();
    const day = today.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab
    
    let start = new Date(today);
    let end = new Date(today);
    
    // Logica: 
    // Se siamo Mer(3), Gio(4) o Ven(5) -> Ciclo VENERDÌ (Start: Mercoledì, End: Venerdì)
    // Se siamo Sab(6), Dom(0), Lun(1) o Mar(2) -> Ciclo MARTEDÌ (Start: Sabato prec, End: Martedì)
    
    if (day >= 3 && day <= 5) {
        // Ciclo VENERDÌ
        // Start: torna indietro a Mercoledì (day 3)
        start.setDate(today.getDate() - (day - 3));
        // End: vai avanti a Venerdì (day 5)
        end.setDate(today.getDate() + (5 - day));
    } else {
        // Ciclo MARTEDÌ
        // End: vai avanti/indietro al prossimo Martedì (day 2)
        const daysToTuesday = (2 - day + 7) % 7; 
        // Se oggi è martedì (0), end è oggi. Se lun (1), +1. Se sab (6), +3.
        // Nota: se oggi è Mar, daysToTue è 0.
        
        // Calcolo fine (Martedì)
        // Se oggi è Mar, end = oggi. Se oggi è Sab, end = tra 3 giorni.
        let diffEnd = (day <= 2) ? (2 - day) : (9 - day);
        end.setDate(today.getDate() + diffEnd);
        
        // Start: Sabato precedente (3 giorni prima del martedì di chiusura)
        start = new Date(end);
        start.setDate(end.getDate() - 3);
    }

    const elStart = document.getElementById('startDate');
    const elEnd = document.getElementById('endDate');
    
    if(elStart) elStart.valueAsDate = start;
    if(elEnd) elEnd.valueAsDate = end;
    
    // 3. Listener Tasto Invio sul Login
    const passInput = document.getElementById('adminPassInput');
    if(passInput) {
        passInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    }
});

function attemptLogin() {
    const passInput = document.getElementById('adminPassInput');
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('loginError');
    
    const pass = passInput.value.trim();
    if (!pass) return;

    // UI Loading
    passInput.disabled = true;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verifica...';
    errorMsg.classList.add('hidden');

    adminPassword = pass;
    fetchOrders(true); // Verifica password chiedendo gli ordini
}

function logout() {
    sessionStorage.removeItem('adminPass');
    adminPassword = "";
    location.reload(); // Ricarica la pagina per tornare al login pulito
}

function switchInterface(showAdmin) {
    const loginSec = document.getElementById('loginSection');
    const adminSec = document.getElementById('adminInterface');
    const passInput = document.getElementById('adminPassInput');
    const loginBtn = document.getElementById('loginBtn');

    if (showAdmin) {
        loginSec.classList.add('hidden');
        adminSec.classList.remove('hidden');
        setTimeout(() => adminSec.classList.remove('opacity-0'), 50);
        // Carica la prima sezione di default
        showSection('dashboard'); 
    } else {
        adminSec.classList.add('hidden');
        adminSec.classList.add('opacity-0');
        loginSec.classList.remove('hidden');
        
        if(passInput) {
            passInput.disabled = false;
            passInput.value = '';
            passInput.focus();
        }
        if(loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Accedi</span><i class="fas fa-arrow-right"></i>';
        }
    }
}

// ============================================================
// 🧭 NAVIGAZIONE (SIDEBAR)
// ============================================================
function showSection(sectionName) {
    // 1. Nascondi tutte le sezioni
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    
    // 2. Reset stile bottoni DESKTOP
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('bg-green-50', 'text-green-700');
        el.classList.add('text-gray-700'); 
    });

    // 3. Reset stile bottoni MOBILE
    document.querySelectorAll('.nav-btn-mobile').forEach(el => {
        el.classList.remove('text-green-600', 'bg-green-50');
        el.classList.add('text-gray-500'); 
    });
    
    // 4. Mostra sezione scelta
    const target = document.getElementById(`section-${sectionName}`);
    if (target) target.classList.remove('hidden');

    // 5. Evidenzia bottone attivo DESKTOP (cerchiamo per onclick)
    const activeBtnDesktop = document.querySelector(`aside button[onclick="showSection('${sectionName}')"]`);
    if (activeBtnDesktop) {
        activeBtnDesktop.classList.add('bg-green-50', 'text-green-700');
        activeBtnDesktop.classList.remove('text-gray-700');
    }

    // 6. Evidenzia bottone attivo MOBILE (cerchiamo per data-target)
    const activeBtnMobile = document.querySelector(`.nav-btn-mobile[data-target="${sectionName}"]`);
    if (activeBtnMobile) {
        activeBtnMobile.classList.add('text-green-600'); // Colore icona attiva
        activeBtnMobile.classList.remove('text-gray-500');
    }

    // 7. Carica dati se necessario
    if(sectionName === 'products') fetchProductsAdmin();
    if(sectionName === 'customers') fetchCustomersAdmin();
    
    // Scrolla in cima su mobile per UX migliore
    if(window.innerWidth < 768) window.scrollTo(0,0);
}

// Toggle menu mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('absolute'); // Per sovrapporsi su mobile
    sidebar.classList.toggle('z-40');
    sidebar.classList.toggle('h-full');
}


// ============================================================
// 📦 DASHBOARD: GESTIONE ORDINI
// ============================================================

async function fetchOrders(isLoginCheck = false, btnElement = null) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    // VARIABILI PER GESTIONE BOTTONE
    let originalText = '';
    
    // 1. ATTIVAZIONE LOADER (O Globale o Sul Tasto)
    if (btnElement) {
        // Se ho cliccato il tasto: animazione sul tasto
        originalText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.classList.add('opacity-75', 'cursor-not-allowed');
        btnElement.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span class="ml-2">Cercando...</span>`;
    } else if (!isLoginCheck) {
        // Se è l'avvio automatico: loader globale a centro pagina
        showLoader(true);
    }
    
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getorders&startDate=${start}&endDate=${end}&password=${encodeURIComponent(adminPassword)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.ok) {
            if (isLoginCheck) {
                sessionStorage.setItem('adminPass', adminPassword);
                switchInterface(true);
            }
            renderOrders(data.orders);
        } else {
            // Gestione Errori Login
            if (isLoginCheck) {
                const errorMsg = document.getElementById('loginError');
                errorMsg.innerText = "Password errata!";
                errorMsg.classList.remove('hidden');
                
                document.getElementById('adminPassInput').disabled = false;
                const loginBtn = document.getElementById('loginBtn');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Accedi</span><i class="fas fa-arrow-right"></i>';
                sessionStorage.removeItem('adminPass');
            } else {
                if(data.error && data.error.includes("Password")) {
                    alert("Sessione scaduta.");
                    logout();
                } else {
                    renderOrders([]); 
                }
            }
        }
    } catch (err) {
        console.error("Errore Fetch:", err);
        if(isLoginCheck) {
             document.getElementById('loginError').innerText = "Errore di connessione.";
             document.getElementById('loginError').classList.remove('hidden');
             document.getElementById('adminPassInput').disabled = false;
             document.getElementById('loginBtn').disabled = false;
             document.getElementById('loginBtn').innerHTML = '<span>Accedi</span>';
        } else {
            alert("Errore di connessione al server.");
        }
    } finally {
        // 2. DISATTIVAZIONE LOADER
        if (btnElement) {
            // Ripristina il tasto
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
            btnElement.classList.remove('opacity-75', 'cursor-not-allowed');
        } else {
            // Nascondi loader globale
            showLoader(false);
        }
    }
}

function renderOrders(orders) {
    showLoader(false);
    const tbody = document.getElementById('ordersTableBody');
    const noData = document.getElementById('noData');
    
    if(tbody) tbody.innerHTML = ''; 
    
    if (!orders || orders.length === 0) {
        if(noData) noData.classList.remove('hidden');
        updateStats([]);
        return;
    }
    if(noData) noData.classList.add('hidden');

    orders.forEach(order => {
        const isDelivery = String(order.delivery).toLowerCase().includes('consegna');
        // Badge Colore: Verde per consegna, Arancio per ritiro
        const badgeClass = isDelivery 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-orange-100 text-orange-800 border-orange-200';
        
        const totalVal = Number(order.total || 0);
        const totalFormatted = totalVal.toFixed(2);
        
        const datePart = order.date ? order.date.split(' ')[0] : 'N/D';
        const timePart = order.date ? order.date.split(' ')[1] || '' : '';
        const itemsClean = String(order.details || "").split(';').map(i => i.trim()).filter(Boolean);

        // Prezzo Modificabile (HTML)
        const priceHtml = `
            <div id="price-box-${order.rowIndex}" 
                 class="flex items-center justify-end gap-2 cursor-pointer p-2 md:p-1 rounded bg-blue-50 md:bg-transparent border border-blue-100 md:border-transparent hover:border-blue-300 transition" 
                 onclick="enableInlineEdit(${order.rowIndex}, '${totalVal}')">
                <span class="font-black text-gray-900 text-lg md:text-base">€ ${totalFormatted}</span>
                <i class="fas fa-pen text-blue-500 md:text-gray-300 hover:text-blue-600 text-sm"></i>
            </div>
        `;

        const notesHtml = order.notes 
            ? `<div class="mb-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded font-medium shadow-sm"><i class="fas fa-exclamation-circle mr-1"></i> ${order.notes}</div>` : '';

        // --- COSTRUZIONE RIGA (Card su Mobile / Table Row su Desktop) ---
        const row = document.createElement('tr');
        
        // Classi per trasformare la riga in una Card su mobile
        row.className = "flex flex-col md:table-row bg-white mb-6 md:mb-0 rounded-xl shadow-md md:shadow-none border border-gray-200 md:border-b md:border-gray-200 p-0 md:p-0 relative group transition duration-200 overflow-hidden";
        
        row.innerHTML = `
          <td class="flex justify-between items-center md:table-cell px-4 py-3 bg-gray-50 md:bg-white border-b md:border-0 border-gray-100 text-sm text-gray-500 align-top">
             <div class="flex items-center gap-2 md:block">
                 <span class="md:hidden font-bold text-gray-400 text-xs uppercase">Data:</span>
                 <div class="font-medium text-gray-900">${datePart}</div>
                 <div class="text-xs bg-gray-200 px-1 rounded md:bg-transparent md:p-0">${timePart}</div>
             </div>
             <div class="md:hidden">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${badgeClass}">
                  ${order.delivery || 'N/D'}
                </span>
             </div>
          </td>

          <td class="flex flex-col md:table-cell px-4 py-3 align-top border-b md:border-0 border-gray-100">
            <span class="md:hidden font-bold text-gray-400 text-xs uppercase mb-1">Cliente:</span>
            
            <div class="text-base md:text-sm font-bold text-gray-900 flex items-center gap-2">
                <i class="fas fa-user-circle text-gray-300 md:hidden"></i>
                ${order.name}
            </div>
            
            <div class="text-sm md:text-xs text-gray-500 mt-1 flex items-start gap-2">
                <i class="fas fa-map-marker-alt text-gray-400 mt-0.5"></i>
                <span>${order.address || '-'}</span>
            </div>
            
            <div class="text-sm md:text-xs text-blue-600 mt-1 cursor-pointer hover:underline flex items-center gap-2" onclick="window.location.href='tel:${order.phone}'">
                <i class="fas fa-phone-alt md:hidden"></i>
                ${order.phone}
            </div>

            <div class="hidden md:block mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}">
                  ${order.delivery || 'N/D'}
                </span>
            </div>
          </td>

          <td class="flex justify-between items-center md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-bold align-top text-right border-t md:border-0 border-gray-100 bg-gray-50 md:bg-white order-last md:order-none">
            <span class="md:hidden font-bold text-gray-600 uppercase">Totale Ordine:</span>
            ${priceHtml}
          </td>

          <td class="flex flex-col md:table-cell px-4 py-3 text-sm text-gray-600 min-w-[300px] align-top">
            <span class="md:hidden font-bold text-gray-400 text-xs uppercase mb-2">Dettaglio Spesa:</span>
            ${notesHtml}
            <ul class="list-none space-y-1 mt-1 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-lg">
                ${itemsClean.map(i => `<li class="flex items-start gap-2"><span class="text-green-500 mt-1">•</span> <span>${i}</span></li>`).join('')}
            </ul>
          </td>
        `;
        tbody.appendChild(row);
    });
    updateStats(orders);
}

// --- Inline Edit Prezzo ---
function enableInlineEdit(rowIndex, currentVal) {
    const box = document.getElementById(`price-box-${rowIndex}`);
    if (!box) return;
    const valForInput = parseFloat(currentVal).toFixed(2);
    
    // Ferma la propagazione per evitare ri-click immediati
    box.onclick = null;
    
    box.innerHTML = `
        <div class="flex items-center justify-end gap-1 animate-fade-in" onclick="event.stopPropagation()">
            <input type="number" step="0.50" id="input-price-${rowIndex}" value="${valForInput}" 
                   class="w-20 p-1 text-right text-sm border border-blue-400 rounded focus:ring-2 focus:ring-blue-200 outline-none font-bold text-gray-800">
            <button onclick="saveInlinePrice(${rowIndex})" class="bg-green-100 text-green-700 hover:bg-green-200 p-1.5 rounded transition"><i class="fas fa-check"></i></button>
            <button onclick="fetchOrders()" class="bg-gray-100 text-gray-500 hover:bg-gray-200 p-1.5 rounded transition"><i class="fas fa-times"></i></button>
        </div>
    `;
    setTimeout(() => {
        const input = document.getElementById(`input-price-${rowIndex}`);
        if(input) input.select(); 
    }, 50);
}

async function saveInlinePrice(rowIndex) {
    const input = document.getElementById(`input-price-${rowIndex}`);
    const box = document.getElementById(`price-box-${rowIndex}`);
    if (!input || !box) return;
    
    let newVal = input.value;
    if (newVal === "" || isNaN(parseFloat(newVal.replace(',','.')))) {
        alert("Inserisci un numero valido");
        return;
    }
    
    box.innerHTML = `<div class="text-xs text-gray-400 py-1">Salvataggio...</div>`;

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=updateorder&row=${rowIndex}&amount=${newVal}&password=${encodeURIComponent(adminPassword)}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
            fetchOrders(); 
        } else {
            alert("Errore: " + (data.message || data.error));
            fetchOrders(); 
        }
    } catch (e) {
        alert("Errore di connessione");
        fetchOrders();
    }
}

// --- Download Doc/Etichette con Animazione ---
async function triggerAction(actionName, btnElement) {
    // 1. Salva lo stato originale del bottone
    const originalContent = btnElement.innerHTML;
    const originalClasses = btnElement.className;

    // 2. Metti il bottone in stato "Loading"
    btnElement.disabled = true;
    btnElement.classList.add('opacity-75', 'cursor-not-allowed');
    btnElement.innerHTML = `
        <i class="fas fa-circle-notch fa-spin text-2xl"></i>
        <span class="font-bold text-lg ml-3">Generazione in corso...</span>
    `;

    // Date
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=${actionName}&startDate=${start}&endDate=${end}&password=${encodeURIComponent(adminPassword)}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.success) {
            // --- CASO 1: SCARICAMENTO DIRETTO (Base64) ---
            if (json.fileData) {
                // Convertiamo la stringa Base64 in un file Blob
                const byteCharacters = atob(json.fileData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Creiamo un link invisibile e lo clicchiamo
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = json.name || "documento.pdf";
                document.body.appendChild(link);
                link.click();
                link.remove();
            } 
            // --- CASO 2: FALLBACK VECCHIO SISTEMA (URL) ---
            else if(json.url) { 
                const link = document.createElement('a');
                link.href = json.url;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                link.remove();
            }

            // Feedback "Fatto!"
            btnElement.innerHTML = `<i class="fas fa-check text-2xl"></i><span class="font-bold text-lg ml-3">Fatto!</span>`;
            setTimeout(() => {
                restoreButton(btnElement, originalContent, originalClasses);
            }, 2000);
        } else {
            alert("Errore: " + (json.message || json.error));
            restoreButton(btnElement, originalContent, originalClasses);
        }

    } catch(e) { 
        console.error(e);
        alert("Errore di connessione: " + e.message);
        restoreButton(btnElement, originalContent, originalClasses);
    }
}

// Funzione helper per ripristinare il bottone
function restoreButton(btn, content, classes) {
    btn.innerHTML = content;
    btn.className = classes; // Ripristina colori e hover originali
    btn.disabled = false;
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
}

function updateStats(orders) {
    const elCount = document.getElementById('countOrders');
    const elSum = document.getElementById('sumTotal');
    const elDel = document.getElementById('deliveryStats');
    if(elCount) elCount.innerText = orders.length;
    if(elSum) {
        const total = orders.reduce((acc, curr) => acc + (Number(curr.total)||0), 0);
        elSum.innerText = "€ " + total.toFixed(2);
    }
    if(elDel) {
        const deliveryCount = orders.filter(o => String(o.delivery).toLowerCase().includes('consegna')).length;
        elDel.innerText = `${deliveryCount} Cons. / ${orders.length - deliveryCount} Ritiro`;
    }
}

// ============================================================
// 🍎 GESTIONE PRODOTTI (CMS)
// ============================================================

async function fetchProductsAdmin() {
    const tbody = document.getElementById('productsTableBody');
    
    // Reset barra azioni
    document.getElementById('bulkActionsBar').classList.add('hidden');
    document.getElementById('selectAllCheckbox').checked = false;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Caricamento catalogo...</td></tr>';
    
    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getproducts&showUnavailable=true`);
        const data = await res.json();
        
        if (!data.products) throw new Error("Dati non validi");
        
        tbody.innerHTML = data.products.map(p => {
            const pricesStr = p.units.map(u => {
                const price = u.newPrice > 0 ? `<span class="text-red-600 font-bold">${u.newPrice}€</span> <s class="text-gray-400 text-xs">${u.price}€</s>` : `${u.price}€`;
                return `<div class="text-xs whitespace-nowrap">${u.type}: ${price}</div>`;
            }).join('');

            return `
            <tr id="row-${p.id}" class="flex flex-col md:table-row bg-white mb-6 md:mb-0 rounded-xl shadow-md md:shadow-none border border-gray-200 md:border-b md:border-gray-200 p-4 md:p-0 relative group transition duration-200">
                
                <td class="flex items-center justify-between md:table-cell px-2 py-2 md:px-4 md:py-3 border-b md:border-0 border-gray-100 cursor-pointer" onclick="toggleRow(this)">
                    <span class="md:hidden font-bold text-gray-500 text-sm">Seleziona:</span>
                    <input type="checkbox" value="${p.id}" class="prod-checkbox w-6 h-6 md:w-5 md:h-5 rounded text-green-600 focus:ring-green-500 cursor-pointer pointer-events-none">
                </td>

                <td class="flex justify-center md:table-cell md:text-left px-4 py-3 border-b md:border-0 border-gray-100">
                    <img src="${p.image || 'https://via.placeholder.com/40'}" class="h-24 w-24 md:h-10 md:w-10 object-cover rounded-lg border bg-gray-100 shadow-sm md:shadow-none">
                </td>

                <td class="flex md:table-cell px-4 py-2 md:py-3 text-lg md:text-sm font-bold text-gray-800 text-center md:text-left">
                    ${p.name}
                </td>

                <td class="flex justify-between items-center md:table-cell px-4 py-2 md:py-3 border-b md:border-0 border-gray-100 text-sm">
                    <span class="md:hidden font-bold text-gray-500">Categoria:</span>
                    <span class="text-gray-600">${p.category}</span>
                </td>

                <td class="flex justify-between items-center md:table-cell px-4 py-2 md:py-3 border-b md:border-0 border-gray-100">
                    <span class="md:hidden font-bold text-gray-500">Prezzo:</span>
                    <div class="text-right md:text-left">${pricesStr}</div>
                </td>

                <td class="flex justify-between items-center md:table-cell px-4 py-2 md:py-3 border-b md:border-0 border-gray-100">
                    <span class="md:hidden font-bold text-gray-500">Stato:</span>
                    <span class="px-2 py-1 rounded text-xs font-bold uppercase ${p.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${p.available ? 'Disponibile' : 'Esaurito'}
                    </span>
                </td>

                <td class="flex md:table-cell px-4 py-4 md:py-3 justify-center md:text-right">
                    <button onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})' 
                            class="w-full md:w-auto text-center bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 font-bold text-sm uppercase px-4 py-2 rounded-lg transition shadow-sm">
                        Modifica
                    </button>
                </td>
            </tr>
        `}).join('');
        
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Errore: ${e.message}</td></tr>`;
    }
}

// --- Modale Prodotti ---

function openProductModal() {
    // Reset form per Nuovo Prodotto
    document.getElementById('prodModalTitle').innerText = "Nuovo Prodotto";
    
    // Svuota campi
    document.getElementById('editProdId').value = "";
    document.getElementById('editProdName').value = "";
    document.getElementById('editProdCat').value = "";
    document.getElementById('editProdDesc').value = "";
    
    document.getElementById('editProdUnit').value = "";
    document.getElementById('editProdPrice').value = "";
    document.getElementById('editProdPromo').value = "";
    
    document.getElementById('editProdAvail').checked = true;
    document.getElementById('editProdUrl').value = "";
    
    document.getElementById('editProdPreview').src = "";
    document.getElementById('editProdFile').value = "";
    
    document.getElementById('productModal').classList.remove('hidden');
}

function editProduct(p) {
    // Popola form per Modifica
    document.getElementById('prodModalTitle').innerText = "Modifica: " + p.name;
    document.getElementById('editProdId').value = p.id;
    
    document.getElementById('editProdName').value = p.name;
    document.getElementById('editProdCat').value = p.category;
    document.getElementById('editProdDesc').value = p.description;
    
    // Per semplicità uniamo i valori delle unità con un trattino
    // (L'admin dovrà rispettare il formato "Kg-Pezzo" "10-5" se vuole mantenere la struttura)
    if(p.units && p.units.length > 0) {
        document.getElementById('editProdUnit').value = p.units.map(u=>u.type).join('-'); 
        document.getElementById('editProdPrice').value = p.units.map(u=>u.price).join('-');
        document.getElementById('editProdPromo').value = p.units.map(u=>u.newPrice).join('-');
    }
    
    document.getElementById('editProdAvail').checked = p.available;
    document.getElementById('editProdUrl').value = p.image;
    document.getElementById('editProdPreview').src = p.image || '';
    document.getElementById('editProdFile').value = "";
    
    document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// Preview Immagine immediata
document.getElementById('editProdFile')?.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('editProdPreview').src = e.target.result;
        }
        reader.readAsDataURL(e.target.files[0]);
    }
});

// Salvataggio
async function saveProductForm() {
    const btn = document.getElementById('btnSaveProd');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    try {
        const fileInput = document.getElementById('editProdFile');
        let base64 = null;
        let fileName = null;

        // Se c'è un nuovo file, convertilo in Base64
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileName = file.name;
            base64 = await toBase64(file);
        }

        const payload = {
            action: 'saveproduct',
            password: adminPassword,
            id: document.getElementById('editProdId').value,
            name: document.getElementById('editProdName').value,
            category: document.getElementById('editProdCat').value,
            description: document.getElementById('editProdDesc').value,
            price: document.getElementById('editProdPrice').value,
            newPrice: document.getElementById('editProdPromo').value,
            unit: document.getElementById('editProdUnit').value,
            available: document.getElementById('editProdAvail').checked,
            imageUrl: document.getElementById('editProdUrl').value, // Vecchia URL (se esiste)
            imageBase64: base64, // Nuova Img Base64 (se caricata)
            imageName: fileName
        };

        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.status === 'success') {
            closeProductModal();
            fetchProductsAdmin(); // Ricarica tabella
            alert("Prodotto salvato con successo!");
        } else {
            alert("Errore Server: " + json.message);
        }

    } catch (e) {
        console.error(e);
        alert("Errore salvataggio: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// Helper per convertire File -> Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});


// ============================================================
// 👥 GESTIONE CLIENTI
// ============================================================

async function fetchCustomersAdmin() {
    const thead = document.getElementById('customersTableHead');
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '<tr><td colspan="100%" class="text-center py-8 text-gray-500"><i class="fas fa-circle-notch fa-spin mr-2"></i>Caricamento clienti...</td></tr>';

    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getcustomers&password=${encodeURIComponent(adminPassword)}`);
        const data = await res.json();

        if (data.ok && data.customers) {
            const headers = data.customers.headers; // Array delle intestazioni (Nome, Telefono, etc.)
            const rows = data.customers.rows;

            // 1. Costruisci Header (Visibile solo su PC)
            thead.innerHTML = '<tr>' + headers.map(h => `<th class="px-4 py-3 text-left font-bold uppercase text-xs text-gray-500 bg-gray-50 tracking-wider whitespace-nowrap">${h}</th>`).join('') + '</tr>';

            // 2. Costruisci Body (Card su Mobile / Tabella su PC)
            tbody.innerHTML = rows.map(r => `
                <tr class="flex flex-col md:table-row bg-white mb-6 md:mb-0 rounded-xl shadow-md md:shadow-none border border-gray-200 md:border-b md:border-gray-200 p-4 md:p-0 hover:bg-gray-50 transition duration-200">
                    
                    ${r.map((cell, i) => `
                        <td class="flex justify-between items-center md:table-cell px-2 py-2 md:px-4 md:py-3 border-b md:border-0 border-gray-100 text-sm text-gray-700">
                            <span class="md:hidden font-bold text-gray-400 text-xs uppercase mr-4 min-w-[100px] text-right">
                                ${headers[i]}:
                            </span>
                            
                            <span class="font-medium md:font-normal text-right md:text-left break-all">
                                ${cell}
                            </span>
                        </td>
                    `).join('')}

                </tr>
            `).join('');
            
        } else {
            tbody.innerHTML = '<tr><td colspan="100%" class="p-4 text-red-500 text-center">Nessun dato trovato o errore password.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="100%" class="p-4 text-red-500 text-center">Errore: ${e.message}</td></tr>`;
    }
}


// ============================================================
// 🔧 UTILITIES
// ============================================================
function showLoader(show) {
    const l = document.getElementById('loader');
    if(l) show ? l.classList.remove('hidden') : l.classList.add('hidden');
}

function showStatus(msg) {
    const el = document.getElementById('statusMsg');
    if(el) {
        el.innerText = msg;
        el.classList.remove('opacity-0');
        setTimeout(() => el.classList.add('opacity-0'), 3000);
    }
}
// --- GESTIONE MASSIVA (BULK ACTIONS) ---

// 1. Seleziona/Deseleziona Tutto
function toggleSelectAll(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.prod-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
    updateBulkUI();
}

function deselectAllProducts() {
    document.getElementById('selectAllCheckbox').checked = false;
    toggleSelectAll({ checked: false });
}

// 2. Aggiorna UI (Mostra/Nascondi barra)
function updateBulkUI() {
    // 1. Gestione Barra e Conteggi
    const allCheckboxes = document.querySelectorAll('.prod-checkbox');
    const selected = document.querySelectorAll('.prod-checkbox:checked');
    const count = selected.length;
    const bar = document.getElementById('bulkActionsBar');
    
    document.getElementById('selectedCount').innerText = count;
    
    if (count > 0) {
        bar.classList.remove('hidden');
    } else {
        bar.classList.add('hidden');
        document.getElementById('selectAllCheckbox').checked = false;
    }

    // 2. Gestione Colori Righe (Evidenziatore)
    allCheckboxes.forEach(cb => {
        const rowId = 'row-' + cb.value;
        const row = document.getElementById(rowId);
        if(row) {
            if (cb.checked) {
                // Selezionato: sfondo giallo/verde chiaro
                row.classList.add('bg-yellow-50', 'border-l-4', 'border-l-green-600'); 
                row.classList.remove('hover:bg-gray-50');
            } else {
                // Non selezionato: normale
                row.classList.remove('bg-yellow-50', 'border-l-4', 'border-l-green-600');
                row.classList.add('hover:bg-gray-50');
            }
        }
    });
}

// 3. Esegui Azione (Chiamata al Server)
async function executeBulkUpdate(makeAvailable) {
    const selected = document.querySelectorAll('.prod-checkbox:checked');
    if (selected.length === 0) return;
    
    const ids = Array.from(selected).map(cb => cb.value);
    const actionText = makeAvailable ? "rendere DISPONIBILI" : "rendere NON DISPONIBILI";
    
    if (!confirm(`Sei sicuro di voler ${actionText} ${ids.length} prodotti?`)) return;
    
    // Mostra loading
    const bar = document.getElementById('bulkActionsBar');
    const originalContent = bar.innerHTML; // Salva i bottoni
    bar.innerHTML = `<div class="flex items-center justify-center w-full text-blue-800"><i class="fas fa-circle-notch fa-spin mr-2"></i> Aggiornamento in corso...</div>`;
    
    try {
        const payload = {
            action: 'bulkupdateavailability',
            password: adminPassword,
            ids: ids,
            available: makeAvailable
        };

        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.status === 'success') {
            alert("Aggiornamento completato!");
            bar.innerHTML = originalContent; // <--- QUESTA È LA RIGA CHE MANCAVA!
            fetchProductsAdmin(); // Ricarica tabella
        } else {
            alert("Errore: " + json.message);
            bar.innerHTML = originalContent; // Ripristina pulsanti
        }
        
    } catch (e) {
        alert("Errore di connessione: " + e.message);
        bar.innerHTML = originalContent; // Ripristina pulsanti
    }
}
// Funzione intelligente per gestire il tocco sulla cella della checkbox
function toggleRow(tdElement) {
    const checkbox = tdElement.querySelector('input[type="checkbox"]');
    // Inverti lo stato
    checkbox.checked = !checkbox.checked;
    
    // Aggiorna UI (barra e colori)
    updateBulkUI();
}