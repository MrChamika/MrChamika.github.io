import { db, seedInitialProducts } from './firebase-setup.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Size Buttons ---
const sizeBtns = document.querySelectorAll('.size-btn');
sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// --- Dynamic Store Catalog Logic (Firebase) ---

async function renderProducts() {
    const gridContainer = document.getElementById('products-grid');
    if (!gridContainer) return;

    await seedInitialProducts();

    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    const products = [];
    snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
    });

    gridContainer.innerHTML = '';

    if (products.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
                <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 1.2rem; display: block;"></i>
                <p>No products found in the catalog. Visit the management portal to add items.</p>
            </div>
        `;
        return;
    }

    products.forEach(prod => {
        const card = document.createElement('div');
        card.className = `product-card theme-${prod.theme || 'orange'}`;
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if(!e.target.closest('.product-card-action') && !e.target.closest('.size-btn') && !e.target.closest('.color-swatch-btn')) {
                window.location.href = `product.html?id=${prod.id}`;
            }
        };

        const sizes = prod.sizes || ['S','M','L','XL'];
        const colors = prod.colors || [{name:'Standard',hex:'#888'}];
        const badgeHTML = prod.badge ? `<span class="product-card-badge">${prod.badge}</span>` : '';
        const coverImage = (prod.images && prod.images.length > 0) ? prod.images[0] : prod.image;

        const sizeBtnsHTML = sizes.map(s =>
            `<button type="button" class="size-btn" data-size="${s}">${s}</button>`
        ).join('');

        const colorSwatchesHTML = colors.map((c, i) =>
            `<button type="button" class="color-swatch-btn ${i === 0 ? 'selected' : ''}" data-color="${c.name}" data-hex="${c.hex}" style="background:${c.hex};" title="${c.name}"></button>`
        ).join('');

        const escapedTitle = prod.title.replace(/"/g, '&quot;');
        const escapedImage = (coverImage || '').replace(/"/g, '&quot;');
        const safeCoverImage = coverImage || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600';

        card.innerHTML = `
            ${badgeHTML}
            <div class="product-card-img-container">
                <img src="${safeCoverImage}" alt="${prod.title}" class="product-card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600'">
            </div>
            <div class="product-card-info">
                <h3 class="product-card-title">${prod.title}</h3>
                <p class="product-card-desc">${prod.description}</p>
                <div class="product-card-variants">
                    <div class="variant-row">
                        <span class="variant-label">Size</span>
                        <div class="variant-options size-options" data-product-id="${prod.id}">
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
                <div class="product-card-meta">
                    <span class="product-card-price">Rs. ${prod.price}</span>
                    <span class="product-card-tag">${prod.theme} edition</span>
                </div>
            </div>
            <button class="product-card-action" data-id="${prod.id}" data-title="${escapedTitle}" data-price="${prod.price}" data-image="${escapedImage}">
                Add to Cart <i class="fa-solid fa-bag-shopping"></i>
            </button>
        `;

        const sizeBtns = card.querySelectorAll('.size-btn');
        if (sizeBtns.length > 0) sizeBtns[0].classList.add('active');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                sizeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        card.querySelectorAll('.color-swatch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.closest('.color-options').querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        card.querySelector('.product-card-action').addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            const cardEl = btn.closest('.product-card');
            const selSize = cardEl.querySelector('.size-btn.active');
            const selColor = cardEl.querySelector('.color-swatch-btn.selected');
            if (!selSize) { showCartToast('Please select a size.', true); return; }
            if (!selColor) { showCartToast('Please select a color.', true); return; }
            addToCart(btn.dataset.id, btn.dataset.title, Number(btn.dataset.price), btn.dataset.image, selSize.dataset.size, selColor.dataset.color);
        });

        gridContainer.appendChild(card);
    });
}

window.addToCart = function(id, title, price, image, size, color) {
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
};

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
        animation: 'none', opacity: '1', transition: 'opacity 0.5s ease'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    setTimeout(() => toast.remove(), 2600);
}

async function loadSocialLinks() {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'social'));
        if (docSnap.exists()) {
            const data = docSnap.data();
            const inst = document.getElementById('link-instagram');
            const fb = document.getElementById('link-facebook');
            const tw = document.getElementById('link-twitter');

            if (inst && data.instagram) inst.href = data.instagram;
            if (fb && data.facebook) fb.href = data.facebook;
            if (tw && data.twitter) tw.href = data.twitter;
        }
    } catch (e) {
        console.error("Could not load social links", e);
    }
}

function updateCartCount() {
    const countEl = document.querySelector('.cart-count');
    if(countEl) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        countEl.textContent = total;
        countEl.style.display = total > 0 ? 'flex' : 'none';
    }
}

function initNavObserver() {
    const sections = {
        hero: document.querySelector('.hero-container'),
        products: document.getElementById('products-section')
    };

    const navItems = document.querySelectorAll('.nav-item');
    if (!sections.hero || !sections.products || navItems.length < 2) return;

    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    };

    const updateActiveState = () => {
        if (window.scrollY < 80) {
            navItems.forEach(item => item.classList.remove('active'));
            navItems[0].classList.add('active');
            return true;
        }
        return false;
    };

    const observer = new IntersectionObserver((entries) => {
        if (updateActiveState()) return;

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navItems.forEach(item => item.classList.remove('active'));

                if (entry.target === sections.products) {
                    navItems[1].classList.add('active');
                } else {
                    navItems[0].classList.add('active');
                }
            }
        });
    }, observerOptions);

    observer.observe(sections.hero);
    observer.observe(sections.products);

    // Initial check on load
    updateActiveState();

    // Listen to scroll events to reset to HOME if scrolled to the top
    window.addEventListener('scroll', updateActiveState);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.search.includes('section=products')) {
        const hero = document.querySelector('.hero-container');
        if (hero) hero.style.display = 'none';
        const productsSec = document.getElementById('products-section');
        if (productsSec) {
            setTimeout(() => productsSec.scrollIntoView({ behavior: 'instant' }), 10);
        }
    }

    updateCartCount();
    renderProducts();
    initNavObserver();
    loadSocialLinks();
});


