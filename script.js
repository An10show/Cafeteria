const menuData = {
    coffee: [
        { id: 'c_espresso', name: 'Expresso', price: 5.00, image: 'coffee_espresso.png' },
        { id: 'c_cappuccino', name: 'Cappuccino Italiano', price: 7.50, image: 'coffee_cappuccino.png' },
        { id: 'c_latte', name: 'Latte Cremoso', price: 8.00, image: 'coffee_latte.png' },
        { id: 'c_mocha', name: 'Mocha Especial', price: 9.50, image: 'coffee_latte.png' }, // Placeholder image
        { id: 'c_coado', name: 'Café Coado na Hora', price: 6.00, image: 'coffee_espresso.png' } // Placeholder image
    ],
    food: [
        { id: 'f_coxinha', name: 'Coxinha de Frango', price: 6.50, image: 'food_coxinha.png' },
        { id: 'f_pastel_carne', name: 'Pastel de Carne', price: 5.50, image: 'food_pastel.png' },
        { id: 'f_pastel_queijo', name: 'Pastel de Queijo', price: 5.50, image: 'food_pastel.png' },
        { id: 'f_empanada', name: 'Empanada Argentina', price: 7.00, image: 'food_coxinha.png' }, // Placeholder image
        { id: 'f_espiga', name: 'Espiga de Milho Cozida', price: 4.00, image: 'food_pao_de_queijo.png' }, // Placeholder image
        { id: 'f_quibe', name: 'Quibe Tradicional', price: 6.00, image: 'food_coxinha.png' }, // Placeholder image
        { id: 'f_pao_de_queijo', name: 'Pão de Queijo (un)', price: 3.00, image: 'food_pao_de_queijo.png' },
        { id: 'f_sonho_creme', name: 'Sonho de Creme', price: 5.00, image: 'food_sonho.png' },
        { id: 'f_sonho_ddl', name: 'Sonho Doce de Leite', price: 5.00, image: 'food_sonho.png' },
        { id: 'f_pao_artesanal', name: 'Pão Artesanal (fatia)', price: 4.50, image: 'food_pao_de_queijo.png' }, // Placeholder for Pão Alfa
        { id: 'f_pao_na_chapa', name: 'Pão na Chapa c/ Manteiga', price: 3.50, image: 'food_pao_de_queijo.png' } // Placeholder for Pão com
    ]
};

let cart = [];
let audioContext;
const audioBuffers = {};

// --- Audio Functions ---
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

async function loadSound(name, url) {
    if (audioBuffers[name]) return audioBuffers[name];
    try {
        const context = getAudioContext();
        if (!context) { // If context couldn't be created (e.g. in a restrictive environment)
            console.warn("AudioContext not available, sounds disabled.");
            return null;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch sound: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        audioBuffers[name] = audioBuffer;
        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound ${name} (${url}):`, error);
        return null;
    }
}

function playSound(name) {
    const context = getAudioContext(); // Ensure context is active
    const audioBuffer = audioBuffers[name];
    if (audioBuffer && context && context.state === 'running') {
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start(0);
    } else if (context && context.state !== 'running') {
        console.warn(`AudioContext is not running. State: ${context.state}. Sound ${name} not played.`);
        // Attempt to resume context on next user interaction if suspended
        context.resume().then(() => console.log("AudioContext resumed.")).catch(e => console.error("Error resuming AudioContext:", e));
    } else if (!audioBuffer) {
        console.warn(`Sound ${name} not loaded or audio context not available.`);
    }
}

async function preloadSounds() {
    // Attempt to create/resume AudioContext on a user gesture.
    // This will be triggered by first click on add-to-cart or cart icon
    // For now, we try to load them, and playSound will handle context state.
    console.log("Preloading sounds...");
    await Promise.all([
        loadSound('addToCartSound', 'add_to_cart.mp3'),
        loadSound('orderPlacedSound', 'order_placed.mp3')
    ]).catch(error => console.error("Error during sound preloading:", error));
    console.log("Sound preloading finished.");
}


// --- DOM Elements ---
const coffeeItemsGrid = document.getElementById('coffee-items-grid');
const foodItemsGrid = document.getElementById('food-items-grid');
const cartButton = document.getElementById('cart-button');
const cartModal = document.getElementById('cart-modal');
const closeModalButton = document.getElementById('close-modal-button');
const cartItemsContainer = document.getElementById('cart-items-container');
const emptyCartMessage = document.getElementById('empty-cart-message');
const cartTotalPriceEl = document.getElementById('cart-total-price');
const cartCountBadge = document.getElementById('cart-count-badge');
const placeOrderButton = document.getElementById('place-order-button');
const tableNumberInput = document.getElementById('table-number-input');
const currentYearEl = document.getElementById('current-year');
const modalOverlay = cartModal.querySelector('.modal-overlay');


// --- Rendering Functions ---
function formatPrice(price) {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
}

function renderMenuItems(items, container, type) {
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item-card';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p class="item-price">${formatPrice(item.price)}</p>
            <button class="btn btn-secondary add-to-cart-button" data-id="${item.id}" data-type="${type}">Adicionar ao Carrinho</button>
        `;
        container.appendChild(card);
    });
}

function renderCart() {
    cartItemsContainer.innerHTML = ''; // Clear previous items
    if (cart.length === 0) {
        emptyCartMessage.style.display = 'block';
    } else {
        emptyCartMessage.style.display = 'none';
        cart.forEach(cartItem => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <div class="cart-item-details">
                    <h4>${cartItem.name}</h4>
                    <p>${formatPrice(cartItem.price)} x ${cartItem.quantity}</p>
                </div>
                <div class="cart-item-quantity-controls">
                    <button class="quantity-decrease" data-id="${cartItem.id}">-</button>
                    <span>${cartItem.quantity}</span>
                    <button class="quantity-increase" data-id="${cartItem.id}">+</button>
                </div>
                <p class="cart-item-price">${formatPrice(cartItem.price * cartItem.quantity)}</p>
                <div class="cart-item-remove">
                    <button class="remove-item-button" data-id="${cartItem.id}" aria-label="Remover ${cartItem.name}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            cartItemsContainer.appendChild(itemDiv);
        });
    }
    updateCartSummary();
}

function updateCartSummary() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalPriceEl.textContent = formatPrice(total);
    cartCountBadge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

// --- Cart Logic ---
function addToCart(itemId, itemType) {
    // Ensure AudioContext is started by user gesture
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const itemData = menuData[itemType].find(item => item.id === itemId);
    if (!itemData) return;

    const existingItem = cart.find(item => item.id === itemId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...itemData, quantity: 1 });
    }
    playSound('addToCartSound');
    renderCart();
}

function updateCartItemQuantity(itemId, change) {
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1); // Remove item if quantity is 0 or less
        }
    }
    renderCart();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    renderCart();
}


// --- Modal Functions ---
function openCartModal() {
    if (audioContext && audioContext.state === 'suspended') { // Try to resume audio context if suspended
        audioContext.resume().catch(e => console.error("Error resuming AudioContext on modal open:", e));
    }
    renderCart();
    cartModal.classList.add('is-open');
    cartModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeCartModal() {
    cartModal.classList.remove('is-open');
    cartModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore background scroll
}

// --- Order Placement ---
function handlePlaceOrder() {
    const tableNum = tableNumberInput.value.trim();
    if (cart.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }
    if (!tableNum) {
        alert("Por favor, informe o número da sua mesa.");
        tableNumberInput.focus();
        return;
    }

    console.log(`Pedido realizado para a mesa: ${tableNum}`);
    console.log("Itens:", cart);
    console.log("Total:", cartTotalPriceEl.textContent);
    
    playSound('orderPlacedSound');
    alert(`Pedido para a mesa ${tableNum} realizado com sucesso! Total: ${cartTotalPriceEl.textContent}`);

    cart = [];
    tableNumberInput.value = '';
    renderCart();
    closeCartModal();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Add to cart buttons (event delegation)
    document.body.addEventListener('click', function(event) {
        // For AudioContext resume on any click
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (event.target.classList.contains('add-to-cart-button')) {
            const itemId = event.target.dataset.id;
            const itemType = event.target.dataset.type;
            addToCart(itemId, itemType);
        }
        if (event.target.closest('.quantity-decrease')) {
            const itemId = event.target.closest('.quantity-decrease').dataset.id;
            updateCartItemQuantity(itemId, -1);
        }
        if (event.target.closest('.quantity-increase')) {
            const itemId = event.target.closest('.quantity-increase').dataset.id;
            updateCartItemQuantity(itemId, 1);
        }
        if (event.target.closest('.remove-item-button')) {
            const itemId = event.target.closest('.remove-item-button').dataset.id;
            removeFromCart(itemId);
        }
    });

    cartButton.addEventListener('click', openCartModal);
    closeModalButton.addEventListener('click', closeCartModal);
    modalOverlay.addEventListener('click', closeCartModal); // Close on overlay click
    placeOrderButton.addEventListener('click', handlePlaceOrder);

    // Close modal on ESC key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && cartModal.classList.contains('is-open')) {
            closeCartModal();
        }
    });
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    getAudioContext(); // Initialize AudioContext early, may need user gesture to start/resume fully.
    preloadSounds();   // Start loading sounds

    renderMenuItems(menuData.coffee, coffeeItemsGrid, 'coffee');
    renderMenuItems(menuData.food, foodItemsGrid, 'food');
    
    setupEventListeners();
    updateCartSummary(); // Initial cart count (0)

    if(currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }
});


