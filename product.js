import { db, auth } from './firebase-setup.js';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import './auth-header-helper.js';

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

    loadReviews(productId);
    setupReviewForm(productId);
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



// ============ Reviews ============

let currentProductId = null;

async function loadReviews(productId) {
    const section = document.getElementById('reviews-section');
    const container = document.getElementById('reviews-container');
    if (!container) return;

    try {
        const q = query(collection(db, 'reviews'), where('productId', '==', productId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const reviews = [];
        snapshot.forEach(d => reviews.push({ id: d.id, ...d.data() }));

        if (reviews.length === 0) {
            section.style.display = 'block';
            container.innerHTML = '<div class="no-reviews"><i class="fa-regular fa-star-half-stroke" style="font-size:2rem;margin-bottom:12px;display:block;"></i><p>No reviews yet. Be the first to review!</p></div>';
            return;
        }

        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = (totalRating / reviews.length).toFixed(1);
        const fullStars = Math.floor(avgRating);
        const starsHTML = renderStars(fullStars);

        const reviewsListHTML = reviews.map(r => {
            const reviewStars = renderStars(r.rating || 0);
            const initials = (r.userName || 'A').charAt(0).toUpperCase();
            const date = r.date ? new Date(r.date.seconds * 1000).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            return `
                <div class="review-card">
                    <div class="review-header">
                        <div class="review-avatar">${initials}</div>
                        <span class="review-author">${r.userName || 'Anonymous'}</span>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-stars">${reviewStars}</div>
                    <div class="review-comment">${r.comment || ''}</div>
                </div>
            `;
        }).join('');

        section.style.display = 'block';
        container.innerHTML = `
            <div class="reviews-summary">
                <div class="reviews-avg-rating">${avgRating}</div>
                <div>
                    <div class="reviews-avg-stars">${starsHTML}</div>
                    <div class="reviews-avg-count">Based on ${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
                </div>
            </div>
            ${reviewsListHTML}
        `;
    } catch (e) {
        console.error('Error loading reviews:', e);
    }
}

async function setupReviewForm(productId) {
    const section = document.getElementById('reviews-section');
    const container = document.getElementById('reviews-container');
    if (!container) return;

    onAuthStateChanged(auth, (user) => {
        const existingForm = document.getElementById('review-form-wrapper');
        if (existingForm) existingForm.remove();

        if (!user) {
            const loginCTA = document.createElement('div');
            loginCTA.id = 'review-form-wrapper';
            loginCTA.className = 'review-login-cta';
            loginCTA.innerHTML = '<a href="login.html?redirect=' + encodeURIComponent(window.location.href) + '">Sign in</a> to leave a review.';
            container.prepend(loginCTA);
            return;
        }

        const form = document.createElement('div');
        form.id = 'review-form-wrapper';
        form.className = 'review-form';
        form.innerHTML = `
            <h3><i class="fa-regular fa-pen-to-square"></i> Write a Review</h3>
            <div class="star-rating-input">
                <input type="radio" name="rating" id="star5" value="5"><label for="star5">★</label>
                <input type="radio" name="rating" id="star4" value="4"><label for="star4">★</label>
                <input type="radio" name="rating" id="star3" value="3"><label for="star3">★</label>
                <input type="radio" name="rating" id="star2" value="2"><label for="star2">★</label>
                <input type="radio" name="rating" id="star1" value="1"><label for="star1">★</label>
            </div>
            <textarea id="review-comment" placeholder="Share your thoughts about this product..."></textarea>
            <button class="submit-btn" id="submit-review-btn">Submit Review</button>
        `;
        container.prepend(form);

        document.getElementById('submit-review-btn').addEventListener('click', async () => {
            const selected = document.querySelector('input[name="rating"]:checked');
            const comment = document.getElementById('review-comment').value.trim();
            if (!selected) { alert('Please select a star rating.'); return; }
            if (!comment) { alert('Please write a comment.'); return; }

            const btn = document.getElementById('submit-review-btn');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                await addDoc(collection(db, 'reviews'), {
                    productId: productId,
                    userId: user.uid,
                    userName: user.displayName || user.email.split('@')[0],
                    rating: Number(selected.value),
                    comment: comment,
                    date: serverTimestamp()
                });
                document.getElementById('review-comment').value = '';
                document.querySelector('input[name="rating"]:checked').checked = false;
                btn.textContent = 'Submitted!';
                setTimeout(() => { btn.textContent = 'Submit Review'; btn.disabled = false; }, 2000);
                loadReviews(productId);
            } catch (e) {
                console.error('Error submitting review:', e);
                alert('Failed to submit review. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Submit Review';
            }
        });
    });
}

function renderStars(count) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= count ? '★' : '☆';
    }
    return html;
}



