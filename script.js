document.addEventListener('DOMContentLoaded', () => {
    // Sostituisci con il tuo URL di distribuzione dello script di Google Apps Script
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyWTkFcvlC5vhMsibcdoa8tTgCCUjOd-XOahSF0sdWq1iR__FdSWtBratu0jSiAdTlf/exec"; 

    // Elementi del DOM
    const catalogTabBtn = document.getElementById('catalog-tab-btn');
    const checkoutTabBtn = document.getElementById('checkout-tab-btn');
    const catalogView = document.getElementById('catalog-view');
    const checkoutView = document.getElementById('checkout-view');
    const productsGrid = document.getElementById('products-grid');
    const headerCartBtn = document.getElementById('header-cart-btn');
    const cartIndicator = document.getElementById('cart-indicator');
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutWhatsappBtn = document.getElementById('checkout-whatsapp-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const filterOfferteBtn = document.getElementById('filter-offerte');
    const filterAllDropdownBtn = document.getElementById('filter-all-dropdown-btn');
    const categoryDropdownMenu = document.getElementById('category-dropdown-menu');
    const addressField = document.getElementById('address-field');
    const deliveryOptionSelect = document.getElementById('delivery-option');
    const customerPhoneInput = document.getElementById('customer-phone');
    const customerNameInput = document.getElementById('customer-name');
    const deliveryAddressInput = document.getElementById('delivery-address');
    const orderNotesTextarea = document.getElementById('order-notes');
    
    // Modale Prodotto
    const productModal = document.getElementById('product-modal');
    const closeProductModalBtn = document.getElementById('close-modal-btn');
    const modalProductImage = document.getElementById('modal-product-image');
    const modalProductName = document.getElementById('modal-product-name');
    const modalProductDescription = document.getElementById('modal-product-description');
    const modalProductPrice = document.getElementById('modal-product-price');
    const decrementQtyBtn = document.getElementById('decrement-qty-btn');
    const modalProductQtyInput = document.getElementById('modal-product-qty');
    const incrementQtyBtn = document.getElementById('increment-qty-btn');
    const modalProductNotesTextarea = document.getElementById('modal-product-notes');
    const addToCartBtn = document.getElementById('add-to-cart-btn');

    // Modale Messaggi
    const messageModal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    let allProducts = [];
    let currentFilter = 'all'; // 'all', 'offerte', 'categoria'
    let selectedCategory = null;
    let orderItems = {};
    let selectedProduct = null;

    // Funzione per mostrare messaggi modali
    const showMessageModal = (title, message) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        messageModal.classList.remove('hidden');
    };

    // Funzione per chiudere il modale messaggi
    const closeMessageModal = () => {
        messageModal.classList.add('hidden');
    };
    
    // Funzione per aggiornare l'indicatore del carrello nell'header
    const updateCartIndicator = () => {
        const totalItems = Object.values(orderItems).reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            cartIndicator.classList.remove('hidden');
        } else {
            cartIndicator.classList.add('hidden');
        }
    };

    // Funzione per filtrare e renderizzare i prodotti
    const renderProducts = () => {
        loadingSpinner.classList.add('hidden');
        productsGrid.innerHTML = '';
        
        let filteredProducts = allProducts;
        
        if (currentFilter === 'offerte') {
            filteredProducts = allProducts.filter(p => p.offerta === 'si');
        } else if (currentFilter === 'categoria' && selectedCategory) {
            filteredProducts = allProducts.filter(p => p.categoria === selectedCategory);
        }
        
        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">Nessun prodotto trovato per la selezione.</p>`;
            return;
        }
        
        filteredProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card-interactive bg-white rounded-xl shadow-lg p-4 flex flex-col items-center text-center';
            productCard.innerHTML = `
                <img src="${product.URL_immagine_catalogo}" alt="${product.Nome}" class="w-full h-40 object-cover rounded-lg mb-4">
                <h3 class="text-xl font-bold text-gray-800">${product.Nome}</h3>
                <p class="text-gray-600 mb-2">${product.Descrizione}</p>
                <p class="text-2xl font-black text-brand-primary">€${product.Prezzo.toFixed(2)} / ${product.Unità}</p>
            `;
            
            productCard.addEventListener('click', () => {
                selectedProduct = product;
                openProductModal(product);
            });
            
            productsGrid.appendChild(productCard);
        });
    };

    // Funzione per aprire il modale del prodotto
    const openProductModal = (product) => {
        modalProductImage.src = product.URL_immagine_catalogo;
        modalProductName.textContent = product.Nome;
        modalProductDescription.textContent = product.Descrizione;
        modalProductPrice.textContent = `€${product.Prezzo.toFixed(2)} / ${product.Unità}`;
        
        const existingItem = orderItems[product.ID_Prodotto];
        modalProductQtyInput.value = existingItem ? existingItem.quantity : 1;
        modalProductNotesTextarea.value = existingItem ? existingItem.notes : '';
        
        productModal.classList.remove('hidden');
    };

    // Funzione per aggiornare il riepilogo del carrello nel checkout
    const renderCheckoutSummary = () => {
        checkoutSummary.innerHTML = '';
        let totalPrice = 0;
        
        if (Object.keys(orderItems).length === 0) {
            checkoutSummary.innerHTML = `<p class="text-center text-gray-500 italic">Il carrello è vuoto. Aggiungi i prodotti dal catalogo!</p>`;
            checkoutWhatsappBtn.disabled = true;
            return;
        }
        
        for (const id in orderItems) {
            const item = orderItems[id];
            const itemTotal = item.quantity * item.Prezzo;
            totalPrice += itemTotal;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'flex justify-between items-center bg-gray-50 p-3 rounded-lg';
            itemElement.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800">${item.Nome} x ${item.quantity} ${item.Unità}</p>
                    ${item.notes ? `<p class="text-sm text-gray-500">Note: ${item.notes}</p>` : ''}
                </div>
                <span class="font-bold text-gray-800">€${itemTotal.toFixed(2)}</span>
            `;
            checkoutSummary.appendChild(itemElement);
        }
        
        const totalElement = document.createElement('div');
        totalElement.className = 'flex justify-between items-center mt-4 pt-4 border-t border-gray-200 font-bold text-lg text-gray-800';
        totalElement.innerHTML = `<span>Totale:</span><span>€${totalPrice.toFixed(2)}</span>`;
        checkoutSummary.appendChild(totalElement);
        
        updateCheckoutButtonState();
    };
    
    // Funzione per aggiornare lo stato del pulsante di invio nel checkout
    const updateCheckoutButtonState = () => {
        const hasOrder = Object.keys(orderItems).length > 0;
        const customerName = customerNameInput.value.trim();
        const customerPhone = customerPhoneInput.value.trim();
        const deliveryOption = deliveryOptionSelect.value;
        const deliveryAddress = deliveryAddressInput.value.trim();

        let isFormValid = hasOrder && customerName !== '' && customerPhone.length >= 8;

        if (deliveryOption === 'Consegna a domicilio') {
            isFormValid = isFormValid && deliveryAddress !== '';
        }

        checkoutWhatsappBtn.disabled = !isFormValid;
    };

    // Fetch dei prodotti dal Google Sheet
    const fetchProducts = async () => {
        loadingSpinner.classList.remove('hidden');
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=products`);
            allProducts = await response.json();
            renderProducts();
            populateCategoryDropdown();
        } catch (error) {
            console.error("Errore nel recupero dei prodotti:", error);
            showMessageModal("Errore", "Impossibile caricare il catalogo. Riprova più tardi.");
            loadingSpinner.classList.add('hidden');
        }
    };
    
    // Popola il menu a tendina delle categorie
    const populateCategoryDropdown = () => {
        const categories = [...new Set(allProducts.map(p => p.categoria))];
        categoryDropdownMenu.innerHTML = '';
        
        // Pulsante "Tutte le categorie"
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn block w-full px-4 py-2 text-left hover:bg-gray-100';
        allBtn.textContent = 'Tutte le categorie';
        allBtn.addEventListener('click', () => {
            currentFilter = 'all';
            selectedCategory = null;
            renderProducts();
            categoryDropdownMenu.classList.add('hidden');
            filterAllDropdownBtn.textContent = 'Tutti ▼';
            filterOfferteBtn.classList.remove('active');
        });
        categoryDropdownMenu.appendChild(allBtn);
        
        categories.forEach(category => {
            const categoryBtn = document.createElement('button');
            categoryBtn.className = 'filter-btn block w-full px-4 py-2 text-left hover:bg-gray-100';
            categoryBtn.textContent = category;
            categoryBtn.addEventListener('click', () => {
                currentFilter = 'categoria';
                selectedCategory = category;
                renderProducts();
                categoryDropdownMenu.classList.add('hidden');
                filterAllDropdownBtn.textContent = `${category} ▼`;
                filterOfferteBtn.classList.remove('active');
            });
            categoryDropdownMenu.appendChild(categoryBtn);
        });
    };
    
    // Funzione per generare il messaggio WhatsApp
    const generateWhatsAppOrder = () => {
        const customerName = customerNameInput.value.trim();
        const customerPhone = customerPhoneInput.value.trim();
        const deliveryOption = deliveryOptionSelect.value;
        const deliveryAddress = deliveryAddressInput.value.trim();
        const orderNotes = orderNotesTextarea.value.trim();
        
        let whatsappMessage = `*Nuovo Ordine* 👇\n\n`;
        whatsappMessage += `*Cliente*: ${customerName}\n`;
        whatsappMessage += `*Telefono*: ${customerPhone}\n`;
        whatsappMessage += `*Opzione di Consegna*: ${deliveryOption}\n`;
        
        if (deliveryOption === 'Consegna a domicilio' && deliveryAddress) {
            whatsappMessage += `*Indirizzo*: ${deliveryAddress}\n`;
        }
        
        if (orderNotes) {
            whatsappMessage += `*Note Generali*: ${orderNotes}\n`;
        }
        
        whatsappMessage += `\n*Dettaglio Ordine*:\n`;
        let orderTotalPrice = 0;
        for (const id in orderItems) {
            const item = orderItems[id];
            const itemTotal = item.quantity * item.Prezzo;
            orderTotalPrice += itemTotal;
            whatsappMessage += `- ${item.Nome} x ${item.quantity} ${item.Unità} (Tot: €${itemTotal.toFixed(2)})`;
            if (item.notes) {
                whatsappMessage += ` | Nota: ${item.notes}`;
            }
            whatsappMessage += `\n`;
        }

        whatsappMessage += `\n*Totale*: €${orderTotalPrice.toFixed(2)}`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    // Funzione per inviare l'ordine a Google Apps Script
    const sendOrderToAppsScript = async () => {
        const orderPayload = {
            customerName: customerNameInput.value.trim(),
            customerPhone: customerPhoneInput.value.trim(),
            deliveryOption: deliveryOptionSelect.value,
            deliveryAddress: deliveryAddressInput.value.trim(),
            orderNotes: orderNotesTextarea.value.trim(),
            items: Object.values(orderItems).map(item => ({
                productName: item.Nome,
                quantity: item.quantity,
                unit: item.Unità,
                notes: item.notes
            }))
        };
        
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(orderPayload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message || 'Errore sconosciuto');
            }
            showMessageModal("Ordine Inviato", "Il tuo ordine è stato ricevuto con successo! Ti aspettiamo.");
            orderItems = {}; // Pulisci il carrello dopo l'invio
            updateCartIndicator();
            renderCheckoutSummary();
            updateCheckoutButtonState();
        } catch (error) {
            console.error("Errore nell'invio dell'ordine:", error);
            showMessageModal("Errore", "Non è stato possibile salvare l'ordine nel database. Riprova più tardi.");
        }
    };
    
    // Event Listeners

    // Gestione della navigazione tra le schede
    catalogTabBtn.addEventListener('click', () => {
        catalogTabBtn.classList.add('active');
        checkoutTabBtn.classList.remove('active');
        catalogView.classList.remove('hidden');
        checkoutView.classList.add('hidden');
        updateCartIndicator();
    });

    checkoutTabBtn.addEventListener('click', () => {
        checkoutTabBtn.classList.add('active');
        catalogTabBtn.classList.remove('active');
        catalogView.classList.add('hidden');
        checkoutView.classList.remove('hidden');
        renderCheckoutSummary();
    });

    headerCartBtn.addEventListener('click', () => {
        checkoutTabBtn.click();
    });
    
    // Gestione dei filtri
    filterOfferteBtn.addEventListener('click', () => {
        if (filterOfferteBtn.classList.contains('active')) {
            currentFilter = 'all';
            filterOfferteBtn.classList.remove('active');
        } else {
            currentFilter = 'offerte';
            filterOfferteBtn.classList.add('active');
            selectedCategory = null;
            filterAllDropdownBtn.textContent = 'Tutti ▼';
        }
        renderProducts();
    });

    filterAllDropdownBtn.addEventListener('click', () => {
        categoryDropdownMenu.classList.toggle('hidden');
    });
    
    // Modale Prodotto - Aggiungi al carrello
    addToCartBtn.addEventListener('click', () => {
        const quantity = parseInt(modalProductQtyInput.value);
        const notes = modalProductNotesTextarea.value.trim();
        
        if (selectedProduct && quantity > 0) {
            orderItems[selectedProduct.ID_Prodotto] = {
                ...selectedProduct,
                quantity,
                notes
            };
            updateCartIndicator();
        } else {
            delete orderItems[selectedProduct.ID_Prodotto];
        }
        
        productModal.classList.add('hidden');
    });
    
    closeProductModalBtn.addEventListener('click', () => {
        productModal.classList.add('hidden');
    });
    
    decrementQtyBtn.addEventListener('click', () => {
        let currentQty = parseInt(modalProductQtyInput.value);
        if (currentQty > 0) {
            modalProductQtyInput.value = currentQty - 1;
        }
    });
    
    incrementQtyBtn.addEventListener('click', () => {
        let currentQty = parseInt(modalProductQtyInput.value);
        modalProductQtyInput.value = currentQty + 1;
    });
    
    // Gestione del form di checkout
    deliveryOptionSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Consegna a domicilio') {
            addressField.classList.remove('hidden');
        } else {
            addressField.classList.add('hidden');
        }
        updateCheckoutButtonState();
    });
    
    customerPhoneInput.addEventListener('input', updateCheckoutButtonState);
    customerNameInput.addEventListener('input', updateCheckoutButtonState);
    deliveryAddressInput.addEventListener('input', updateCheckoutButtonState);
    
    checkoutWhatsappBtn.addEventListener('click', () => {
        generateWhatsAppOrder();
        sendOrderToAppsScript();
    });

    modalCloseBtn.addEventListener('click', closeMessageModal);

    // Caricamento iniziale
    fetchProducts();

});

