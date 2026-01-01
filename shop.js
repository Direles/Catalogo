// CONFIGURAZIONE
const SCRIPT_URL = API_URL; 

let products = [];
let cart = {}; 
let currentProduct = null; 

// STATO DEI FILTRI
let activeCategory = 'all';

// AVVIO
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

// 1. CARICAMENTO PRODOTTI
async function loadProducts() {
    try {
        // MODIFICA QUI: Aggiungiamo &showUnavailable=true per scaricare TUTTO il database
        const res = await fetch(`${SCRIPT_URL}?action=getproducts&showUnavailable=true&pageSize=1000`);
        const data = await res.json();
        
        if (data.ok) {
            products = data.products;
            renderCategories(products);
            applyFilters(); // Ora i filtri funzioneranno perché abbiamo i dati!
        } else {
            console.error("Errore dati:", data);
        }
    } catch (e) {
        console.error("Errore fetch:", e);
        document.getElementById('productGrid').innerHTML = '<div class="text-center w-full col-span-2 text-red-500">Errore di connessione. Ricarica la pagina.</div>';
    } finally {
        const l = document.getElementById('loader');
        if(l) l.classList.add('hidden');
    }
}

// 2. SISTEMA DI FILTRAGGIO (Logica Esclusiva)
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const onlyOffers = document.getElementById('filterOffers').checked;
    
    // Recupera la nuova checkbox "Mostra solo esauriti"
    const showOnlySoldOut = document.getElementById('filterSoldOut').checked; 
    
    const clearBtn = document.getElementById('clearSearchBtn');

    // Gestione visibilità tasto "X"
    if(clearBtn) {
        if(searchTerm.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    // Filtra l'array originale
    const filtered = products.filter(p => {
        // 1. Filtro Categoria
        if (activeCategory !== 'all' && p.category !== activeCategory) return false;

        // 2. Filtro Ricerca
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm) && 
            !(p.description || '').toLowerCase().includes(searchTerm)) return false;

        // 3. Filtro Solo Offerte
        if (onlyOffers && !p.offer) return false;

        // 4. FILTRO DISPONIBILITÀ (Logica Esclusiva)
        if (showOnlySoldOut) {
            // Se spuntato: Mostra SOLO quelli NON disponibili (Esauriti)
            if (p.available) return false; 
        } else {
            // Se NON spuntato (Default): Mostra SOLO quelli disponibili
            if (!p.available) return false;
        }

        return true;
    });

    renderProducts(filtered);
    updateCategoryStyles(); 
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterOffers').checked = false;
    document.getElementById('filterSoldOut').checked = false; // Reset nuova checkbox
    selectCategory('all');
}

function selectCategory(cat) {
    activeCategory = cat;
    applyFilters();
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    applyFilters();
}

// 3. RENDER INTERFACCIA
function renderProducts(list) {
    const grid = document.getElementById('productGrid');
    
    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-500">
                <i class="fas fa-search text-3xl mb-3 opacity-20"></i>
                <p>Nessun prodotto trovato con questi criteri.</p>
                <button onclick="resetFilters()" class="mt-2 text-green-700 underline text-sm">Mostra tutti</button>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(p => {
        const img = p.image || 'https://via.placeholder.com/300x200?text=No+Image';
        
        let priceDisplay = "";
        if (p.units.length > 1) {
             const minP = Math.min(...p.units.map(u => u.newPrice > 0 ? u.newPrice : u.price));
             priceDisplay = `da €${minP.toFixed(2)}`;
        } else {
             const u = p.units[0];
             const finalP = u.newPrice > 0 ? u.newPrice : u.price;
             priceDisplay = `€${finalP.toFixed(2)} / ${u.type}`;
        }

        // Opacità se esaurito
        const opacityClass = !p.available ? 'opacity-60 grayscale' : '';

        return `
        <div onclick="openProductModal('${p.id}')" class="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition transform hover:-translate-y-1 ${opacityClass}">
            <div class="h-48 overflow-hidden relative">
                <img src="${img}" class="w-full h-full object-cover" alt="${p.name}">
                ${p.offer ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">Offerta</span>' : ''}
                ${!p.available ? '<div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><span class="bg-gray-800 text-white px-3 py-1 rounded text-sm font-bold shadow border border-white">Esaurito</span></div>' : ''}
            </div>
            <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-bold text-lg leading-tight mb-1 text-gray-800">${p.name}</h3>
                <p class="text-sm text-gray-500 mb-3 line-clamp-2">${p.description || ''}</p>
                
                <div class="mt-auto flex justify-between items-end border-t pt-3 border-gray-50">
                    <div class="text-green-700 font-bold text-lg">${priceDisplay}</div>
                    <button class="bg-green-50 text-green-700 hover:bg-green-100 rounded-full w-8 h-8 flex items-center justify-center transition">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function renderCategories(list) {
    const cats = [...new Set(list.map(p => p.category).filter(Boolean))].sort();
    const container = document.getElementById('categoryFilter');
    
    let html = `<button onclick="selectCategory('all')" id="cat-btn-all" class="cat-btn bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm hover:bg-gray-50 transition">Tutti</button>`;
    
    html += cats.map(c => 
        `<button onclick="selectCategory('${c}')" id="cat-btn-${c.replace(/\s+/g, '-')}" class="cat-btn bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm hover:bg-gray-50 transition">${c}</button>`
    ).join('');
    
    container.innerHTML = html;
    updateCategoryStyles();
}

function updateCategoryStyles() {
    // Resetta tutti
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.className = 'cat-btn bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm hover:bg-gray-50 transition';
    });

    // Attiva quello corrente
    const activeId = activeCategory === 'all' ? 'cat-btn-all' : `cat-btn-${activeCategory.replace(/\s+/g, '-')}`;
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) {
        activeBtn.className = 'cat-btn bg-green-700 text-white px-4 py-2 rounded-full text-sm whitespace-nowrap shadow transition transform scale-105';
    }
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterOffers').checked = false;
    document.getElementById('filterAvailable').checked = false;
    selectCategory('all');
}

// 3. LOGICA MODALE PRODOTTO
function openProductModal(pid) {
    const p = products.find(x => x.id === pid);
    if(!p) return;
    if(!p.available) return; // Non aprire se esaurito

    currentProduct = p;
    
    // Popola UI
    document.getElementById('pmImage').src = p.image || 'https://via.placeholder.com/300x200';
    document.getElementById('pmTitle').innerText = p.name;
    document.getElementById('pmDesc').innerText = p.description || '';
    document.getElementById('pmNotes').value = ''; // Reset note
    document.getElementById('pmQty').innerText = '1';

    // Genera opzioni unità
    const unitsDiv = document.getElementById('pmUnits');
    unitsDiv.innerHTML = p.units.map((u, idx) => {
        const price = u.newPrice > 0 ? u.newPrice : u.price;
        const isChecked = idx === 0 ? 'checked' : ''; // Seleziona il primo di default
        // Mostra vecchio prezzo barrato se in offerta
        const priceHtml = u.newPrice > 0 
            ? `<span class="line-through text-gray-400 mr-2 text-xs">€${u.price.toFixed(2)}</span><span class="text-red-600 font-bold">€${u.newPrice.toFixed(2)}</span>`
            : `<span>€${price.toFixed(2)}</span>`;

        return `
        <label class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-green-50 transition ${isChecked ? 'ring-2 ring-green-500 bg-green-50' : ''}" onclick="selectPmUnit(this)">
            <div class="flex items-center gap-3">
                <input type="radio" name="pmUnit" value="${idx}" ${isChecked} class="text-green-600 focus:ring-green-500 w-4 h-4">
                <span class="font-medium capitalize">${u.type}</span>
            </div>
            <div class="text-sm">${priceHtml}</div>
        </label>
        `;
    }).join('');

    updatePmTotal();
    document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
    currentProduct = null;
}

function selectPmUnit(label) {
    // Rimuove stile 'active' dagli altri
    const all = document.querySelectorAll('#pmUnits label');
    all.forEach(l => {
        l.classList.remove('ring-2', 'ring-green-500', 'bg-green-50');
        l.querySelector('input').checked = false;
    });
    // Aggiunge al selezionato
    label.classList.add('ring-2', 'ring-green-500', 'bg-green-50');
    label.querySelector('input').checked = true;
    updatePmTotal();
}

function adjustPmQty(delta) {
    const el = document.getElementById('pmQty');
    let v = parseInt(el.innerText) + delta;
    if (v < 1) v = 1;
    el.innerText = v;
    updatePmTotal();
}

function updatePmTotal() {
    if(!currentProduct) return;
    const idx = document.querySelector('input[name="pmUnit"]:checked').value;
    const u = currentProduct.units[idx];
    const qty = parseInt(document.getElementById('pmQty').innerText);
    const price = u.newPrice > 0 ? u.newPrice : u.price;
    const total = price * qty;
    
    document.getElementById('pmBtnPrice').innerText = `• €${total.toFixed(2)}`;
}

function addToCartFromModal() {
    if(!currentProduct) return;
    
    const idx = document.querySelector('input[name="pmUnit"]:checked').value;
    const u = currentProduct.units[idx];
    const qty = parseInt(document.getElementById('pmQty').innerText);
    const notes = document.getElementById('pmNotes').value.trim();

    // Creiamo una chiave unica per Prodotto + Unità (Note separate creano righe separate? Per ora no, sovrascriviamo note se identiche, o accodiamo)
    // Meglio: Prodotto + Unità è la chiave univoca. Le note si aggiornano.
    const cartKey = `${currentProduct.id}_${u.type}`;

    if (!cart[cartKey]) {
        cart[cartKey] = {
            product: currentProduct,
            unitIdx: idx,
            qty: 0,
            notes: '' 
        };
    }

    cart[cartKey].qty += qty;
    if(notes) {
        // Se c'è già una nota, aggiungiamo la nuova
        cart[cartKey].notes = cart[cartKey].notes ? (cart[cartKey].notes + "; " + notes) : notes;
    }

    updateBadge();
    closeProductModal();
    
    // Feedback visivo rapido (opzionale)
    const badge = document.getElementById('cartBadge');
    badge.classList.add('scale-125');
    setTimeout(() => badge.classList.remove('scale-125'), 200);
}


// 4. LOGICA CARRELLO
function updateCart(key, delta) {
    if (cart[key]) {
        cart[key].qty += delta;
        if (cart[key].qty <= 0) {
            delete cart[key];
        }
    }
    updateBadge();
    renderCartModal();
}

function updateBadge() {
    const totalItems = Object.values(cart).reduce((a, b) => a + b.qty, 0);
    const badge = document.getElementById('cartBadge');
    badge.innerText = totalItems;
    badge.classList.toggle('hidden', totalItems === 0);
}

function toggleCart() {
    const modal = document.getElementById('cartModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderCartModal();
    }
}

function renderCartModal() {
    const container = document.getElementById('cartItems');
    const items = Object.values(cart);

    // Nota: Calcoliamo il totale solo per sapere se il carrello è vuoto, 
    // ma NON lo mostriamo più all'utente.
    let totalCheck = 0; 

    if (items.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                <i class="fas fa-shopping-basket text-4xl mb-3 opacity-20"></i>
                <p>Il carrello è vuoto</p>
                <button onclick="toggleCart()" class="mt-4 text-green-700 font-bold text-sm">Inizia lo shopping</button>
            </div>`;
        document.getElementById('cartTotal').innerText = '—'; // Nascondi totale
        return;
    }

    container.innerHTML = items.map(item => {
        const u = item.product.units[item.unitIdx];
        const price = u.newPrice > 0 ? u.newPrice : u.price;
        // const lineTotal = price * item.qty; // Non lo mostriamo più
        totalCheck += 1;
        
        const key = `${item.product.id}_${u.type}`;

        return `
        <div class="flex flex-col border-b border-gray-100 py-3 last:border-0">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold text-gray-800">${item.product.name}</div>
                    <div class="text-xs text-gray-500">${u.type}</div> ${item.notes ? `<div class="text-xs text-orange-600 mt-1 italic"><i class="fas fa-pen mr-1"></i>${item.notes}</div>` : ''}
                </div>
                </div>
            
            <div class="flex justify-between items-center mt-2">
                <button onclick="updateCart('${key}', -1000)" class="text-gray-400 hover:text-red-500 text-xs underline">Rimuovi</button>
                <div class="flex items-center bg-gray-100 rounded-lg">
                    <button onclick="updateCart('${key}', -1)" class="w-8 h-8 flex items-center justify-center text-green-700 font-bold hover:bg-gray-200 rounded-l-lg">-</button>
                    <span class="w-8 text-center text-sm font-medium">${item.qty}</span>
                    <button onclick="updateCart('${key}', 1)" class="w-8 h-8 flex items-center justify-center text-green-700 font-bold hover:bg-gray-200 rounded-r-lg">+</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // SCRIVIAMO QUESTO AL POSTO DEL PREZZO
    document.getElementById('cartTotal').innerHTML = '<span class="text-sm font-normal text-gray-500">Da calcolare al peso</span>';
}

// 5. CHECKOUT E INVIO
async function lookupCustomer() {
    const phoneInput = document.getElementById('customerPhone');
    const loader = document.getElementById('phoneLoader');
    const submitBtn = document.getElementById('btnSubmit'); // Tasto invia ordine
    
    // Pulisce caratteri non numerici
    const phone = phoneInput.value.replace(/\D/g,'');
    
    // Se il numero è troppo corto, non fare nulla
    if (phone.length < 9) return;

    // --- 1. BLOCCA TUTTO E MOSTRA SPINNER ---
    phoneInput.disabled = true;      // Blocca scrittura
    if(submitBtn) submitBtn.disabled = true; // Blocca invio
    if(loader) loader.classList.remove('hidden'); // Mostra icona

    try {
        const res = await fetch(`${SCRIPT_URL}?action=getcustomerbyphone&phone=${phone}`);
        const data = await res.json();
        
        // Mostra i campi successivi (Nome, Indirizzo, ecc.)
        const fields = document.getElementById('customerFields');
        fields.classList.remove('hidden');

        // Se trovato, compila i campi
        if (data.ok && data.found) {
            document.getElementById('customerName').value = data.customer.name || '';
            document.getElementById('customerAddress').value = data.customer.address || '';
            // Opzionale: Se vuoi dare un feedback "Trovato!"
            // alert("Bentornato " + data.customer.name); 
        }
    } catch(e) { 
        console.error("Errore ricerca cliente:", e); 
    } finally {
        // --- 2. SBLOCCA TUTTO (Sia se va bene, sia se va male) ---
        phoneInput.disabled = false;
        if(loader) loader.classList.add('hidden'); // Nascondi icona
        
        // Riabilita il tasto invio (se vuoi puoi lasciarlo disabilitato finché non compila il nome)
        if(submitBtn) submitBtn.disabled = false;
        
        // Rimetti il focus sul telefono se l'utente vuole correggerlo
        phoneInput.focus();
    }
}

async function submitOrder() {
    const phone = document.getElementById('customerPhone').value;
    const name = document.getElementById('customerName').value;
    const address = document.getElementById('customerAddress').value;
    const notes = document.getElementById('orderNotes').value;
    
    const deliveryEl = document.querySelector('input[name="delivery"]:checked');
    const delivery = deliveryEl ? deliveryEl.value : 'Consegna a domicilio';

    if (!phone || !name) {
        alert("Per favore inserisci almeno Telefono e Nome.");
        return;
    }

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerText = "Invio in corso...";

    // Prepara payload (Il totale viene comunque calcolato o ignorato dal backend, 
    // ma l'importante è che il cliente non lo veda come definitivo)
    const items = Object.values(cart).map(i => {
        const u = i.product.units[i.unitIdx];
        const price = u.newPrice > 0 ? u.newPrice : u.price;
        return {
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.qty,
            unit: u.type,
            price: price,
            notes: i.notes
        };
    });

    const payload = {
        customerName: name,
        customerPhone: phone,
        deliveryOption: delivery,
        deliveryAddress: address,
        orderNotes: notes,
        items: items
    };

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.log("Errore salvataggio", e);
    }

    // 2. WhatsApp - RIMOSSO TOTALE
    const waItems = items.map(i => {
        let r = `- ${i.quantity} ${i.unit} di ${i.productName}`;
        if(i.notes) r += ` (Note: ${i.notes})`;
        return r;
    }).join('\n');

    // Messaggio senza prezzo
	const waText = `Ciao, sono ${name}.\nVorrei ordinare:\n${waItems}\n\nConsegna: ${delivery}\nIndirizzo: ${address}\nNote ordine: ${notes}`;
    
    // Inserisci qui il tuo numero corretto
    const waLink = `https://wa.me/393298635593?text=${encodeURIComponent(waText)}`;
    
    setTimeout(() => {
        cart = {};
        updateBadge();
        toggleCart();
        btn.innerText = "Inviato!";
        window.location.href = waLink;
    }, 800);
}