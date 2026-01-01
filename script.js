// CONFIGURAZIONE
const GOOGLE_SCRIPT_URL = typeof API_URL !== 'undefined' ? API_URL : "INSERISCI_URL_SE_NON_USI_CONFIG_JS"; 

let adminPassword = ""; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controlla se c'è una sessione attiva
    const savedPass = sessionStorage.getItem('adminPass');
    
    if (savedPass) {
        // Se c'è la password salvata, prova ad accedere direttamente
        adminPassword = savedPass;
        fetchOrders(true); // true = è un controllo di login
    } else {
        // Altrimenti mostra il login (che è già visibile di default nell'HTML)
    }
    
    // Setup date
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6);
    const elEnd = document.getElementById('endDate');
    const elStart = document.getElementById('startDate');
    if(elEnd) elEnd.valueAsDate = today;
    if(elStart) elStart.valueAsDate = lastWeek;
    
    // Invio con tasto Enter
    const passInput = document.getElementById('adminPassInput');
    if(passInput) {
        passInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') attemptLogin();
        });
    }
});

// --- LOGIN SYSTEM ---

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
    
    // Chiamata di prova per verificare la password
    fetchOrders(true);
}

function switchInterface(showAdmin) {
    const loginSec = document.getElementById('loginSection');
    const adminSec = document.getElementById('adminInterface');
    const passInput = document.getElementById('adminPassInput');
    const loginBtn = document.getElementById('loginBtn');

    if (showAdmin) {
        // Nascondi Login, Mostra Admin
        loginSec.classList.add('hidden');
        adminSec.classList.remove('hidden');
        // Piccolo ritardo per l'animazione opacity
        setTimeout(() => adminSec.classList.remove('opacity-0'), 50);
    } else {
        // Mostra Login, Nascondi Admin
        adminSec.classList.add('hidden');
        adminSec.classList.add('opacity-0');
        loginSec.classList.remove('hidden');
        
        // Reset tasti
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

function logout() {
    sessionStorage.removeItem('adminPass');
    adminPassword = "";
    switchInterface(false);
}

// --- API ---

async function fetchOrders(isLoginCheck = false) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if (!isLoginCheck) showLoader(true);
    
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getorders&startDate=${start}&endDate=${end}&password=${encodeURIComponent(adminPassword)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.ok) {
            // PASSWORD OK
            if (isLoginCheck) {
                sessionStorage.setItem('adminPass', adminPassword);
                switchInterface(true); // Sblocca interfaccia
            }
            renderOrders(data.orders);
        } else {
            // PASSWORD ERRATA o Errore Server
            if (isLoginCheck) {
                const errorMsg = document.getElementById('loginError');
                errorMsg.innerText = "Password errata!";
                errorMsg.classList.remove('hidden');
                
                // Reset UI Login
                document.getElementById('adminPassInput').disabled = false;
                const loginBtn = document.getElementById('loginBtn');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Accedi</span><i class="fas fa-arrow-right"></i>';
                
                sessionStorage.removeItem('adminPass');
            } else {
                console.error("Errore API:", data);
                if(data.error && data.error.includes("Password")) {
                    alert("Sessione scaduta. Rifai il login.");
                    logout();
                } else {
                    renderOrders([]);
                }
            }
        }
    } catch (err) {
        console.error("Errore Fetch:", err);
        if(isLoginCheck) {
             const errorMsg = document.getElementById('loginError');
             errorMsg.innerText = "Errore di connessione.";
             errorMsg.classList.remove('hidden');
             
             document.getElementById('adminPassInput').disabled = false;
             document.getElementById('loginBtn').disabled = false;
             document.getElementById('loginBtn').innerHTML = '<span>Accedi</span>';
        } else {
            alert("Errore di connessione al server.");
        }
        showLoader(false);
    }
}

// --- ACTIONS ---

async function saveInlinePrice(rowIndex, mode) {
    const input = document.getElementById(`input-${mode}-${rowIndex}`);
    const box = document.getElementById(`price-box-${mode}-${rowIndex}`);
    
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
        console.error(e);
        alert("Errore di connessione");
        fetchOrders();
    }
}

async function triggerAction(actionName) {
    showStatus("Elaborazione...");
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=${actionName}&password=${encodeURIComponent(adminPassword)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
            showStatus(json.message);
            if(json.url) { 
                const link = document.createElement('a');
                link.href = json.url;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
        } else {
            alert("Errore: " + (json.message || json.error));
        }
    } catch(e) { alert("Errore: " + e.message); }
}

// --- RENDER FUNCTIONS (Uguali a prima, solo copiate per completezza) ---
function renderOrders(orders) {
    showLoader(false);
    const tbody = document.getElementById('ordersTableBody');
    const mobileList = document.getElementById('mobileOrdersList');
    const noData = document.getElementById('noData');
    
    if(tbody) tbody.innerHTML = ''; 
    if(mobileList) mobileList.innerHTML = '';
    
    if (!orders || orders.length === 0) {
        if(noData) noData.classList.remove('hidden');
        updateStats([]);
        return;
    }
    if(noData) noData.classList.add('hidden');

    orders.forEach(order => {
        const isDelivery = String(order.delivery).toLowerCase().includes('consegna');
        const badgeClass = isDelivery ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-100 text-orange-800 border-orange-200';
        const badgeIcon = isDelivery ? 'fa-truck' : 'fa-box-open';
        
        const totalVal = Number(order.total || 0);
        const totalFormatted = totalVal.toFixed(2);
        
        const datePart = order.date ? order.date.split(' ')[0] : 'N/D';
        const timePart = order.date ? order.date.split(' ')[1] || '' : '';
        const itemsClean = String(order.details || "").split(';').map(i => i.trim()).filter(Boolean);
        const addressUrl = order.address ? `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(order.address)}` : '#';

        const priceHtml = (mode) => `
            <div id="price-box-${mode}-${order.rowIndex}" 
                 class="flex items-center justify-end gap-2 cursor-pointer p-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition" 
                 onclick="enableInlineEdit(${order.rowIndex}, '${totalVal}', '${mode}')">
                <span class="font-black text-gray-900">€ ${totalFormatted}</span>
                <i class="fas fa-pen text-gray-300 hover:text-blue-600 text-xs"></i>
            </div>
        `;

        if (mobileList) {
            const card = document.createElement('div');
            card.className = "bg-white rounded-xl p-4 shadow-sm border border-gray-100";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="text-xs text-gray-400 font-bold mb-0.5">${datePart} <span class="font-normal opacity-75">${timePart}</span></div>
                        <h3 class="font-bold text-lg text-gray-800 leading-tight">${order.name}</h3>
                        ${order.address ? `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-map-marker-alt mr-1 text-gray-400"></i>${order.address}</div>` : ''}
                    </div>
                    <div class="text-right">
                        ${priceHtml('mobile')}
                        <span class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeClass}">
                           <i class="fas ${badgeIcon} mr-1"></i> ${isDelivery ? 'Spediz.' : 'Ritiro'}
                        </span>
                    </div>
                </div>
                <div class="flex gap-2 mb-3">
                    ${order.phone ? `<a href="tel:${order.phone}" class="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 rounded-lg text-center text-sm font-medium transition"><i class="fas fa-phone mr-2 text-green-600"></i>Chiama</a>` : ''}
                    ${order.address && isDelivery ? `<a href="${addressUrl}" target="_blank" class="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 rounded-lg text-center text-sm font-medium transition"><i class="fas fa-map-marker-alt mr-2 text-blue-600"></i>Mappa</a>` : ''}
                </div>
                <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-100">
                    ${order.notes ? `<div class="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded shadow-sm"><i class="fas fa-sticky-note mr-1"></i> <b>NOTE:</b> ${order.notes}</div>` : ''}
                    <ul class="space-y-1">
                        ${itemsClean.map(i => `<li class="flex items-start"><span class="mr-2 text-green-500">•</span>${i}</li>`).join('')}
                    </ul>
                </div>
            `;
            mobileList.appendChild(card);
        }

        if (tbody) {
            const row = document.createElement('tr');
            row.className = "hover:bg-gray-50 transition border-b last:border-0";
            const notesHtml = order.notes 
                ? `<div class="mb-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded font-medium shadow-sm"><i class="fas fa-exclamation-circle mr-1"></i> ${order.notes}</div>` : '';

            row.innerHTML = `
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 align-top">
                 <div class="font-medium text-gray-900">${datePart}</div>
                 <div class="text-xs">${timePart}</div>
              </td>
              <td class="px-4 py-3 align-top">
                <div class="text-sm font-bold text-gray-900">${order.name}</div>
                <div class="text-xs text-gray-500 mt-0.5"><i class="fas fa-map-marker-alt mr-1 text-gray-400"></i>${order.address || '-'}</div>
                <div class="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onclick="window.location.href='tel:${order.phone}'">${order.phone}</div>
                <span class="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}">
                  ${order.delivery || 'N/D'}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-bold align-top text-right">
                ${priceHtml('desktop')}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 min-w-[300px] align-top">
                ${notesHtml}
                <ul class="list-none space-y-1 mt-1">
                    ${itemsClean.map(i => `<li>• ${i}</li>`).join('')}
                </ul>
              </td>
            `;
            tbody.appendChild(row);
        }
    });
    updateStats(orders);
}

function enableInlineEdit(rowIndex, currentVal, mode) {
    const boxId = `price-box-${mode}-${rowIndex}`;
    const box = document.getElementById(boxId);
    if (!box) return;
    const valForInput = parseFloat(currentVal).toFixed(2);
    box.innerHTML = `
        <div class="flex items-center justify-end gap-1 animate-fade-in" onclick="event.stopPropagation()">
            <input type="number" step="0.50" id="input-${mode}-${rowIndex}" value="${valForInput}" 
                   class="w-20 p-1 text-right text-sm border border-blue-400 rounded focus:ring-2 focus:ring-blue-200 outline-none font-bold text-gray-800">
            <button onclick="saveInlinePrice(${rowIndex}, '${mode}')" class="bg-green-100 text-green-700 hover:bg-green-200 p-1.5 rounded transition"><i class="fas fa-check"></i></button>
            <button onclick="cancelInlinePrice(${rowIndex}, '${currentVal}', '${mode}')" class="bg-gray-100 text-gray-500 hover:bg-gray-200 p-1.5 rounded transition"><i class="fas fa-times"></i></button>
        </div>
    `;
    setTimeout(() => {
        const input = document.getElementById(`input-${mode}-${rowIndex}`);
        if(input) input.select(); 
    }, 50);
}

function cancelInlinePrice(rowIndex, oldVal, mode) { fetchOrders(); }
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