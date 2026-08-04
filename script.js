import { db, seedInitialProducts } from './firebase-setup.js';
import { collection, getDocs, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import './auth-header-helper.js';

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

    // 1. Instant Cache Render (0ms delay)
    const cachedProducts = localStorage.getItem('cached_products_catalog');
    if (cachedProducts) {
        try {
            allProducts = JSON.parse(cachedProducts);
            if (allProducts.length > 0) {
                renderFilteredProducts();
            }
        } catch(e) {
            console.warn('Failed parsing cached products', e);
        }
    }

    // 2. Run seed non-blocking in background
    seedInitialProducts().catch(() => {});

    // 3. Run reviews and products query in parallel
    window.ratingsMap = {};
    
    const fetchReviewsPromise = getDocs(collection(db, 'reviews')).then(reviewsSnap => {
        let productRatings = {};
        reviewsSnap.forEach(d => {
            const data = d.data();
            const pid = data.productId;
            if (!productRatings[pid]) productRatings[pid] = { sum: 0, count: 0 };
            productRatings[pid].sum += (data.rating || 0);
            productRatings[pid].count++;
        });
        for (let pid in productRatings) {
            window.ratingsMap[pid] = (productRatings[pid].sum / productRatings[pid].count).toFixed(1);
        }
    }).catch(e => console.error('Error loading reviews:', e));

    try {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        await fetchReviewsPromise;

        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (products.length > 0) {
            allProducts = products;
            localStorage.setItem('cached_products_catalog', JSON.stringify(products));
            renderFilteredProducts();
            return;
        }

        // Only clear grid if zero products were found
        if (products.length === 0 && !allProducts.length) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
                    <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 1.2rem; display: block;"></i>
                    <p>No products found in the catalog. Visit the management portal to add items.</p>
                </div>
            `;
        }

        allProducts = products;
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
    } catch (e) {
        console.error('Error loading products:', e);
        gridContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #ff4757;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; margin-bottom: 1.2rem; display: block;"></i>
                <p style="font-weight:700;">Failed to load products.</p>
                <p style="font-size:0.85rem; color:#aaa; margin-top:8px;">Firestore error: ${e.code || e.message}</p>
                <p style="font-size:0.8rem; color:#888; margin-top:6px;">Check your Firebase Firestore Security Rules — public read access on the <em>products</em> collection may be denied.</p>
            </div>
        `;
    }
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
            const inst = document.querySelectorAll('a[aria-label="Instagram"]');
            const fb = document.querySelectorAll('a[aria-label="Facebook"]');
            const tk = document.querySelectorAll('a[aria-label="TikTok"]');

            if (data.instagram) inst.forEach(el => el.href = data.instagram);
            if (data.facebook) fb.forEach(el => el.href = data.facebook);
            if (data.tiktok) tk.forEach(el => el.href = data.tiktok);
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





// ============ Search, Filter & Sort ============

let allProducts = [];
let activeFilter = 'all';
let searchQuery = '';
let sortBy = 'default';

function setupToolbar() {
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const sortSelect = document.getElementById('sort-select');

    if (!searchInput && !filterChips.length && !sortSelect) return;

    // Debounced search
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = searchInput.value.toLowerCase().trim();
                renderFilteredProducts();
            }, 300);
        });
    }

    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            renderFilteredProducts();
        });
    });

    // Sort
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            sortBy = sortSelect.value;
            renderFilteredProducts();
        });
    }
}

function renderFilteredProducts() {
    const gridContainer = document.getElementById('products-grid');
    if (!gridContainer) return;

    let filtered = [...allProducts];

    // Filter by badge
    if (activeFilter !== 'all') {
        filtered = filtered.filter(p => p.badge === activeFilter);
    }

    // Search by title or description
    if (searchQuery) {
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(searchQuery) ||
            (p.description && p.description.toLowerCase().includes(searchQuery))
        );
    }

    // Sort
    if (sortBy === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
    }

    // Clear grid and re-render
    gridContainer.innerHTML = '';
    if (filtered.length === 0) {
        gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);"><i class="fa-regular fa-face-frown" style="font-size: 3rem; margin-bottom: 1.2rem; display: block;"></i><p>No products match your search or filters.</p></div>';
        return;
    }

    // Re-render filtered products
    const localRatings = window.ratingsMap || {};
    filtered.forEach(prod => {
        const starsHtml = localRatings[prod.id]
            ? '<span class="stars-display">' + renderStars(Number(localRatings[prod.id])) + '</span> <span class="stars-count">(' + localRatings[prod.id] + ')</span>'
            : '';

        const sizes = prod.sizes || ['S','M','L','XL'];
        const colors = prod.colors || [{name:'Standard',hex:'#888'}];
        const badgeHTML = prod.badge ? '<span class="product-card-badge">' + prod.badge + '</span>' : '';
        const coverImage = (prod.images && prod.images.length > 0) ? prod.images[0] : prod.image;
        const safeCoverImage = coverImage || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600';
        const escapedTitle = prod.title.replace(/"/g, '&quot;');
        const escapedImage = (coverImage || '').replace(/"/g, '&quot;');

        const sizeBtnsHTML = sizes.map(s => '<button type="button" class="size-btn" data-size="' + s + '">' + s + '</button>').join('');
        const colorSwatchesHTML = colors.map((c, i) => '<button type="button" class="color-swatch-btn ' + (i === 0 ? 'selected' : '') + '" data-color="' + c.name + '" data-hex="' + c.hex + '" style="background:' + c.hex + ';" title="' + c.name + '"></button>').join('');

        const card = document.createElement('div');
        card.className = 'product-card theme-' + (prod.theme || 'orange');
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if (!e.target.closest('.product-card-action') && !e.target.closest('.size-btn') && !e.target.closest('.color-swatch-btn')) {
                window.location.href = 'product.html?id=' + prod.id;
            }
        };

        card.innerHTML = badgeHTML +
            '<div class="product-card-img-container"><img src="' + safeCoverImage + '" alt="' + escapedTitle + '" class="product-card-img" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600\'"></div>' +
            '<div class="product-card-info">' +
                '<h3 class="product-card-title">' + prod.title + '</h3>' +
                '<p class="product-card-desc">' + prod.description + '</p>' +
                (starsHtml ? '<div class="product-card-stars">' + starsHtml + '</div>' : '') +
                '<div class="product-card-variants">' +
                    '<div class="variant-row"><span class="variant-label">Size</span><div class="variant-options size-options" data-product-id="' + prod.id + '">' + sizeBtnsHTML + '</div></div>' +
                    '<div class="variant-row"><span class="variant-label">Color</span><div class="variant-options color-options">' + colorSwatchesHTML + '</div></div>' +
                '</div>' +
                '<div class="product-card-meta">' +
                    '<span class="product-card-price">Rs. ' + prod.price + '</span>' +
                    '<span class="product-card-tag">' + (prod.theme || '') + ' edition</span>' +
                '</div>' +
            '</div>' +
            '<button class="product-card-action" data-id="' + prod.id + '" data-title="' + escapedTitle + '" data-price="' + prod.price + '" data-image="' + escapedImage + '">Add to Cart <i class="fa-solid fa-bag-shopping"></i></button>';

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

function renderStars(count) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= count ? '★' : '☆';
    }
    return html;
}






