document.addEventListener('DOMContentLoaded', renderCart);

function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
    const cart = getCart();
    const grid = document.getElementById('cart-grid');
    
    if (cart.length === 0) {
        grid.innerHTML = `
            <div class="empty-cart" style="grid-column: 1/-1;">
                <i class="fa-solid fa-cart-arrow-down"></i>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added any items yet.</p>
                <a href="index.html#products-section" class="checkout-btn" style="max-width: 200px; margin: 20px auto;">Shop Collection</a>
            </div>
        `;
        return;
    }

    let itemsHTML = '<div class="cart-items">';
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const variantInfo = (item.size && item.color)
            ? `<div class="cart-item-variant">Size: ${item.size} &middot; Color: ${item.color}</div>`
            : '';
        itemsHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    ${variantInfo}
                    <div class="cart-item-price">Rs. ${item.price}</div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQty('${item.variantKey || item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQty('${item.variantKey || item.id}', 1)">+</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeItem('${item.variantKey || item.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    itemsHTML += '</div>';

    const continueBtn = `<a href="index.html?section=products#products-section" class="continue-shopping-btn"><i class="fa-solid fa-arrow-left-long"></i> Continue Shopping</a>`;

    const shipping = subtotal > 0 ? 500 : 0; // Flat 500 Rs shipping if cart not empty
    const total = subtotal + shipping;

    const summaryHTML = `
        <div class="cart-summary">
            <h3 class="summary-title">Order Summary</h3>
            <div class="summary-row">
                <span>Subtotal</span>
                <span>Rs. ${subtotal}</span>
            </div>
            <div class="summary-row">
                <span>Shipping</span>
                <span>Rs. ${shipping}</span>
            </div>
            <div class="summary-row summary-total">
                <span>Total</span>
                <span>Rs. ${total}</span>
            </div>
            <a href="checkout.html" class="checkout-btn">Proceed to Checkout</a>
        </div>
    `;

    grid.innerHTML = itemsHTML + continueBtn + summaryHTML;
}

window.updateQty = function(key, change) {
    let cart = getCart();
    const item = cart.find(i => (i.variantKey || i.id) === key);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => (i.variantKey || i.id) !== key);
        }
        saveCart(cart);
        renderCart();
    }
};

window.removeItem = function(key) {
    let cart = getCart();
    cart = cart.filter(i => (i.variantKey || i.id) !== key);
    saveCart(cart);
    renderCart();
};

