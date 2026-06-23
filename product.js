import { db } from './firebase-setup.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const container = document.getElementById('product-content');

    if (!productId) {
        container.innerHTML = '<div class="loading">Product not found. <a href="index.html" style="color:#fff;">Return home</a></div>';
        return;
    }

    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const prod = docSnap.data();

            // Set theme color dynamically based on product theme
            document.body.className = `theme-${prod.theme || 'black'}`;

            const badgeHTML = prod.badge ? `<span class="badge">${prod.badge}</span>` : '';

            // Handle multiple images
            const images = (prod.images && prod.images.length > 0) ? prod.images : [prod.image];
            const coverImage = images[0];

            let thumbnailsHTML = '';
            if (images.length > 1) {
                thumbnailsHTML = `<div style="display:flex; gap:10px; margin-top:15px; overflow-x:auto;">`;
                images.forEach((imgSrc, idx) => {
                    thumbnailsHTML += `<img src="${imgSrc}" class="product-thumb" loading="lazy" data-idx="${idx}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; cursor:pointer; border: 2px solid ${idx === 0 ? '#ff6a00' : 'transparent'}; transition: border 0.3s ease;">`;
                });
                thumbnailsHTML += `</div>`;
            }

            const sizes = prod.sizes || ['S', 'M', 'L', 'XL'];
            const colors = prod.colors || [{ name: 'Standard', hex: '#888' }];

            const sizeBtnsHTML = sizes.map(s =>
                `<button type="button" class="size-btn" data-size="${s}">${s}</button>`
            ).join('');

            const colorSwatchesHTML = colors.map((c, i) =>
                `<button type="button" class="color-swatch-btn ${i === 0 ? 'selected' : ''}" data-color="${c.name}" data-hex="${c.hex}" style="background:${c.hex};" title="${c.name}"></button>`
            ).join('');

            container.innerHTML = `
                <div class="product-container">
                    <div class="product-image-box" style="display:flex; flex-direction:column;">
                        <img id="main-product-img" src="${coverImage}" alt="${prod.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600'" style="width:100%; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        ${thumbnailsHTML}
                    </div>
                    <div class="product-info-box">
                        ${badgeHTML}
                        <h1 class="product-title">${prod.title}</h1>
                        <div class="product-price">Rs. ${prod.price}</div>
                        <p class="product-description">${prod.description}</p>
                        
                        <div class="product-variants">
                            <div class="variant-row">
                                <span class="variant-label">Size</span>
                                <div class="variant-options size-options">
                                    ${sizeBtnsHTML}
                                </div>
                            </div>
                            <div class="variant-row">
                                <span class="variant-label">Color</span>
                                <div class="variant-options color-options">
                                    ${colorSwatchesHTML}
                                </div>
                            </div>
                        </div>
                        
                        <button class="add-to-cart-large" id="add-btn">
                            Add to Cart <i class="fa-solid fa-bag-shopping"></i>
                        </button>
                    </div>
                </div>
            `;

            // Setup thumbnail click handlers
            const thumbs = container.querySelectorAll('.product-thumb');
            const mainImg = document.getElementById('main-product-img');
            thumbs.forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    mainImg.src = e.target.src;
                    thumbs.forEach(t => t.style.borderColor = 'transparent');
                    e.target.style.borderColor = '#ff6a00';
                });
            });

            // Size selection
            const sizeBtns = container.querySelectorAll('.size-btn');
            if (sizeBtns.length > 0) sizeBtns[0].classList.add('active');
            sizeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    sizeBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            // Color selection
            container.querySelectorAll('.color-swatch-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.closest('.color-options').querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });

            document.getElementById('add-btn').addEventListener('click', () => {
                const selSize = container.querySelector('.size-btn.active');
                const selColor = container.querySelector('.color-swatch-btn.selected');
                if (!selSize) { showCartToast('Please select a size.', true); return; }
                if (!selColor) { showCartToast('Please select a color.', true); return; }
                addToCart(productId, prod.title, prod.price, coverImage, selSize.dataset.size, selColor.dataset.color);
            });

        } else {
            container.innerHTML = '<div class="loading">Product no longer exists. <a href="index.html" style="color:#fff;">Return home</a></div>';
        }
    } catch (e) {
        console.error("Error fetching product:", e);
        container.innerHTML = '<div class="loading">Error loading product.</div>';
    }
});

function addToCart(id, title, price, image, size, color) {
    const variantKey = `${id}||${size || 'OS'}||${color || 'Standard'}`;
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.variantKey === variantKey);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, variantKey, title, price, image, size: size || 'OS', color: color || 'Standard', quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showCartToast('Added to cart!');
}

function showCartToast(msg, isError) {
    const existing = document.getElementById('cart-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.innerHTML = isError
        ? '<i class="fa-solid fa-circle-exclamation" style="color:#ff4757;"></i> ' + msg
        : '<i class="fa-solid fa-circle-check"></i> ' + msg;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '30px', right: '30px',
        background: isError ? '#2d1b1b' : '#fff',
        color: isError ? '#ff4757' : '#000',
        padding: '12px 24px', borderRadius: '50px',
        fontFamily: 'Montserrat, sans-serif', fontWeight: '700',
        boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
        zIndex: '999999', display: 'flex', alignItems: 'center', gap: '10px',
        opacity: '1', transition: 'opacity 0.5s ease'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    setTimeout(() => toast.remove(), 2600);
}

function updateCartCount() {
    const countEl = document.querySelector('.cart-count');
    if (countEl) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        countEl.textContent = total;
        countEl.style.display = total > 0 ? 'flex' : 'none';
    }
}

