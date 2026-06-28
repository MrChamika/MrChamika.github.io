import { db, auth, seedInitialProducts } from './firebase-setup.js';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =============================================
//  JACKET MASTERS â€” ADMIN CONTROL PORTAL JS
// =============================================

// â”€â”€ Auth Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const loginOverlay = document.createElement('div');
loginOverlay.id = 'login-overlay';
loginOverlay.innerHTML = `
    <div style="background: rgba(25,25,25,0.9); padding: 40px; border-radius: 12px; max-width: 400px; width: 100%; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
        <h2 style="margin-bottom: 20px; font-family: 'Playfair Display', serif;">Admin Login</h2>
        <p style="color: #aaa; margin-bottom: 20px; font-size: 0.9rem;">Sign in with your Firebase Auth admin account.</p>
        <form id="admin-login-form">
            <input type="email" id="login-email" placeholder="Email" required style="width: 100%; padding: 12px; margin-bottom: 15px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 6px;">
            <input type="password" id="login-pass" placeholder="Password" required style="width: 100%; padding: 12px; margin-bottom: 20px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 6px;">
            <button type="submit" style="width: 100%; padding: 12px; background: #fff; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Login</button>
        </form>
    </div>
`;
Object.assign(loginOverlay.style, {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
});

document.body.appendChild(loginOverlay);

onAuthStateChanged(auth, user => {
    if (user) {
        loginOverlay.style.display = 'none';
        initAdminData();
    } else {
        loginOverlay.style.display = 'flex';
    }
});

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Login failed. Check console for details or ensure you created the user in Firebase.");
        console.error(error);
    }
});

function showToast(message, type = 'success') {
    const existing = document.getElementById('admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-xmark'}"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2900);
}

// â”€â”€ Admin Data Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function initAdminData() {
    try {
        await seedInitialProducts();
    } catch(e) {
        console.error('Seed failed:', e);
    }
    try {
        await renderCatalog();
    } catch(e) {
        console.error('Catalog render failed:', e);
        const wrapper = document.getElementById('catalog-items-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `<div class="empty-state" style="color:#ff4757;">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Error loading products. Check console for details.</p>
            </div>`;
        }
    }
    renderPaymentMethods();
    renderOrders();
    loadSocialLinks();

    // Bind reset button
    document.getElementById('reset-catalog-btn')?.addEventListener('click', resetStore);

    // Bind cancel edit button
    document.getElementById('cancel-edit-btn')?.addEventListener('click', cancelEdit);
}

async function resetStore() {
    if (!confirm('âš ï¸ This will delete ALL current products and restore the 3 default jackets. Continue?')) return;
    try {
        // Delete all existing products
        const snapshot = await getDocs(collection(db, 'products'));
        for (const d of snapshot.docs) {
            await deleteDoc(doc(db, 'products', d.id));
        }
        // Re-seed defaults
        const defaults = [
            { id: '1', title: 'Apex Fire Puffer', price: 14900, description: 'Vibrant emergency orange outer layer with full heat retention lining, weather-proofing, and custom pull chords.', theme: 'orange', badge: 'Best Selling', image: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=600&auto=format&fit=crop&q=80', images: ['https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=600&auto=format&fit=crop&q=80'], sizes: ['S','M','L','XL'], colors: [{name:'Fire Orange',hex:'#ff6a00'},{name:'Shadow Black',hex:'#333333'}] },
            { id: '2', title: 'Tundra Ice Shell', price: 16900, description: 'Alpine white and ice blue dual-tone weather shield. Built for active skiing, snowboard maneuvers, and extreme sub-zero conditions.', theme: 'blue', badge: 'New Arrival', image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80', images: ['https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80'], sizes: ['S','M','L','XL','XXL'], colors: [{name:'Ice Blue',hex:'#00d2ff'},{name:'Arctic White',hex:'#f0f0f0'}] },
            { id: '3', title: 'Obsidian Shadow Coat', price: 18900, description: 'Stealth matte black shell with custom quilted lines. Features magnetic pockets, water-repellent zippers, and high loft goose down filling.', theme: 'black', badge: 'Limited Edition', image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80', images: ['https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80'], sizes: ['M','L','XL','XXL'], colors: [{name:'Shadow Black',hex:'#333333'},{name:'Arctic White',hex:'#f0f0f0'}] }
        ];
        for (const prod of defaults) {
            await setDoc(doc(db, 'products', prod.id), prod);
        }
        showToast('Store reset to defaults!', 'success');
        renderCatalog();
    } catch(e) {
        showToast('Reset failed.', 'error');
        console.error(e);
    }
}

// â”€â”€ Catalog Rendering (Firebase) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function renderCatalog() {
    const wrapper = document.getElementById('catalog-items-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = '<div style="padding: 20px;">Loading products...</div>';

    try {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        const products = [];
        snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    if (products.length === 0) {
        wrapper.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>No products in the store yet.</p>
            </div>`;
        return;
    }

    wrapper.innerHTML = '';
    products.forEach(prod => {
        const row = document.createElement('div');
        row.className = 'catalog-item';
        row.dataset.id = prod.id;

        const themeClass = ['orange', 'blue', 'black'].includes(prod.theme) ? prod.theme : 'orange';
        const coverImage = (prod.images && prod.images.length > 0) ? prod.images[0] : prod.image;

        const sizeStr = (prod.sizes && prod.sizes.length) ? prod.sizes.join(', ') : '';
        const colorDots = (prod.colors && prod.colors.length)
            ? prod.colors.map(c => `<span class="color-mini-dot" style="background:${c.hex};" title="${c.name}"></span>`).join('')
            : '';

        row.innerHTML = `
            <img class="catalog-thumb" src="${coverImage}" alt="${prod.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544923246-77307dd654cb?w=200'">
            <div class="catalog-item-info">
                <div class="catalog-item-name" title="${prod.title}">${prod.title}</div>
                <span class="catalog-item-theme ${themeClass}">${themeClass} edition</span>
                ${sizeStr ? `<div class="catalog-item-sizes">${sizeStr}</div>` : ''}
                ${colorDots ? `<div class="catalog-item-colors">${colorDots}</div>` : ''}
            </div>
            <div class="catalog-item-price">Rs. ${prod.price}</div>
            <div class="catalog-item-actions">
                <button class="edit-btn" onclick="window.editProduct('${prod.id}')" title="Edit this product">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="delete-btn" onclick="window.deleteProduct('${prod.id}', '${prod.title.replace(/'/g, "\\'")}')" title="Remove this product">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>`;
        wrapper.appendChild(row);
    });
    } catch(e) {
        console.error('renderCatalog error:', e);
        wrapper.innerHTML = `<div class="empty-state" style="color:#ff4757;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>Error loading products. Check console.</p>
        </div>`;
    }
}

window.deleteProduct = async (id, title) => {
    if (!confirm(`Delete ${title}?`)) return;
    try {
        await deleteDoc(doc(db, 'products', id));
        showToast(`"${title}" removed.`, 'success');
        renderCatalog();
    } catch(e) {
        showToast('Error removing product', 'error');
    }
};

// â”€â”€ Edit Product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

window.editProduct = async (id) => {
    const snapshot = await getDocs(collection(db, 'products'));
    let product = null;
    snapshot.forEach(doc => {
        if (doc.id === id) product = { id: doc.id, ...doc.data() };
    });
    if (!product) { showToast('Product not found.', 'error'); return; }
    populateForm(product);
};

function populateForm(product) {
    document.getElementById('editing-id').value = product.id;

    document.getElementById('prod-title').value = product.title || '';
    document.getElementById('prod-price').value = product.price || '';
    document.getElementById('prod-desc').value = product.description || '';

    // Set badge radio
    const badgeRadios = document.querySelectorAll('input[name="badge"]');
    badgeRadios.forEach(r => r.checked = r.value === (product.badge || ''));

    // Set theme radio
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(r => r.checked = r.value === (product.theme || 'orange'));

    // Set sizes
    const sizeInputs = document.querySelectorAll('.size-chip input');
    sizeInputs.forEach(inp => inp.checked = (product.sizes || []).includes(inp.value));

    // Set colors
    const colorGrid = document.querySelector('.color-selector-grid');
    const existingChips = colorGrid.querySelectorAll('.color-chip');
    // Uncheck all first
    existingChips.forEach(chip => {
        const inp = chip.querySelector('input');
        inp.checked = false;
    });
    // Remove custom colors from previous edit
    existingChips.forEach(chip => {
        if (chip.getAttribute('data-custom') === 'true') chip.remove();
    });
    // Add/check matching colors
    (product.colors || []).forEach(c => {
        const match = colorGrid.querySelector(`.color-chip input[value="${c.name}"]`);
        if (match) {
            match.checked = true;
        } else {
            const chip = document.createElement('label');
            chip.className = 'color-chip';
            chip.setAttribute('data-custom', 'true');
            chip.setAttribute('data-hex', c.hex);
            chip.innerHTML = `
                <input type="checkbox" name="color" value="${c.name}" checked>
                <span class="color-dot" style="background:${c.hex};"></span>
                <span class="color-label">${c.name}</span>
                <button type="button" class="color-chip-remove" title="Remove color"><i class="fa-solid fa-xmark"></i></button>
            `;
            chip.querySelector('.color-chip-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                chip.remove();
            });
            colorGrid.appendChild(chip);
        }
    });

    // Set images in URL tab
    activeTab = 'url';
    document.getElementById('tab-url').click();
    document.getElementById('prod-image-url').value = (product.images || [product.image].filter(Boolean)).join('\n');

    // Show cancel button, update form title
    document.getElementById('cancel-edit-btn').style.display = '';
    document.querySelector('.card-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Product';
    document.querySelector('.card-subtitle').textContent = 'Updating an existing product.';

    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('editing-id').value = '';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('add-product-form').reset();
    document.querySelectorAll('.color-chip[data-custom="true"]').forEach(c => c.remove());
    pendingFiles = [];
    if (document.getElementById('preview-thumbnails')) {
        document.getElementById('preview-thumbnails').innerHTML = '';
        document.getElementById('file-preview-container').style.display = 'none';
        document.getElementById('file-upload-zone').style.display = '';
    }
    document.querySelector('.card-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add New Product';
    document.querySelector('.card-subtitle').textContent = 'Create a new puffer jacket variant. Fields marked * are required.';
    // Reset to file tab
    document.getElementById('tab-file').click();
}

// â”€â”€ Image Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let pendingFiles = [];  // Store actual File objects
let activeTab = 'file';

function fileToResizedBase64(file, maxW = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/jpeg', 0.8));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function initImageTabs() {
    const tabFile       = document.getElementById('tab-file');
    const tabUrl        = document.getElementById('tab-url');
    const contentFile   = document.getElementById('content-file');
    const contentUrl    = document.getElementById('content-url');
    const fileZone      = document.getElementById('file-upload-zone');
    const fileInput     = document.getElementById('prod-image-file');
    const previewCont   = document.getElementById('file-preview-container');
    const previewThumbnails = document.getElementById('preview-thumbnails');
    const removeBtn     = document.getElementById('remove-preview-btn');

    if(!tabFile) return;

    tabFile.addEventListener('click', () => {
        activeTab = 'file';
        tabFile.classList.add('active');
        tabUrl.classList.remove('active');
        contentFile.style.display = '';
        contentUrl.style.display  = 'none';
    });

    tabUrl.addEventListener('click', () => {
        activeTab = 'url';
        tabUrl.classList.add('active');
        tabFile.classList.remove('active');
        contentUrl.style.display  = '';
        contentFile.style.display = 'none';
    });

    fileZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) processFiles(fileInput.files);
    });

    function processFiles(files) {
        pendingFiles = [];
        previewThumbnails.innerHTML = '';
        
        const fileArray = Array.from(files).slice(0, 5);
        let tooBig = false;
        
        for(let file of fileArray) {
            if (!file.type.startsWith('image/')) continue;
            if (file.size > 2 * 1024 * 1024) { tooBig = true; continue; }
            
            pendingFiles.push(file);
            
            // Show preview using object URL (no Base64 needed for preview)
            const objectUrl = URL.createObjectURL(file);
            const img = document.createElement('img');
            img.src = objectUrl;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '6px';
            img.style.border = '1px solid rgba(255,255,255,0.2)';
            previewThumbnails.appendChild(img);
        }
        
        if (tooBig) {
            showToast('Images over 2MB were skipped.', 'error');
        }
        if (pendingFiles.length > 0) {
            fileZone.style.display = 'none';
            previewCont.style.display = '';
        }
    }

    removeBtn.addEventListener('click', () => {
        pendingFiles = [];
        fileInput.value  = '';
        previewThumbnails.innerHTML = '';
        previewCont.style.display = 'none';
        fileZone.style.display    = '';
    });
}

// â”€â”€ Form Submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initForm() {
    const form = document.getElementById('add-product-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        
        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const title = document.getElementById('prod-title').value.trim();
        const price = document.getElementById('prod-price').value.trim();
        const badgeInput = form.querySelector('input[name="badge"]:checked');
        const badge = badgeInput ? badgeInput.value : '';
        const desc  = document.getElementById('prod-desc').value.trim();
        
        // Fix for missing theme radios in admin.html, defaulting to orange if missing
        const themeInput = form.querySelector('input[name="theme"]:checked');
        const theme = themeInput ? themeInput.value : 'orange';

        const editingId = document.getElementById('editing-id').value;
        const newId = editingId || Date.now().toString();

        let finalImages = [];
        if (activeTab === 'file') {
            if (pendingFiles.length === 0) {
                showToast('Please select at least one image.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Save Product to Store';
                return;
            }
            showToast('Processing images...', 'success');
            try {
                for (const file of pendingFiles) {
                    const dataUrl = await fileToResizedBase64(file);
                    finalImages.push(dataUrl);
                }
            } catch (err) {
                showToast('Image processing failed.', 'error');
                console.error('Image error:', err);
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Save Product to Store';
                return;
            }
        } else {
            const lines = document.getElementById('prod-image-url').value.split('\n');
            finalImages = lines.map(url => url.trim()).filter(url => url.length > 0).slice(0, 5);
        }

        if (finalImages.length === 0) {
            showToast('Please provide at least one image.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Save Product to Store';
            return;
        }

        // Read sizes
        const sizeInputs = form.querySelectorAll('.size-chip input:checked');
        const sizes = Array.from(sizeInputs).map(inp => inp.value);

        // Read colors
        const colorInputs = form.querySelectorAll('.color-chip input:checked');
        const colors = Array.from(colorInputs).map(inp => ({
            name: inp.value,
            hex: inp.closest('.color-chip').getAttribute('data-hex')
        }));

        const newProduct = { id: newId, title, price: Number(price), description: desc, theme, badge, sizes, colors, images: finalImages, image: finalImages[0] };

        try {
            await setDoc(doc(db, 'products', newId), newProduct);
            if (editingId) {
                showToast(`"${title}" updated!`, 'success');
            } else {
                showToast(`"${title}" added!`, 'success');
            }
            renderCatalog();
            cancelEdit();
        } catch(err) {
            showToast('Error saving product.', 'error');
            console.error(err);
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Save Product to Store';
    });
}

// â”€â”€ Custom Color Adder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initColorAdder() {
    const nameInput = document.getElementById('custom-color-name');
    const hexInput = document.getElementById('custom-color-hex');
    const addBtn = document.getElementById('add-color-btn');
    const grid = document.querySelector('.color-selector-grid');
    if (!nameInput || !hexInput || !addBtn || !grid) return;

    function addCustomColor() {
        const name = nameInput.value.trim();
        if (!name) { showToast('Enter a color name.', 'error'); return; }
        const hex = hexInput.value;

        // Check duplicate
        const existing = grid.querySelectorAll('.color-chip input');
        for (const inp of existing) {
            if (inp.value.toLowerCase() === name.toLowerCase()) {
                showToast('Color already exists.', 'error'); return;
            }
        }

        const chip = document.createElement('label');
        chip.className = 'color-chip';
        chip.setAttribute('data-custom', 'true');
        chip.setAttribute('data-hex', hex);
        chip.innerHTML = `
            <input type="checkbox" name="color" value="${name}" checked>
            <span class="color-dot" style="background:${hex};"></span>
            <span class="color-label">${name}</span>
            <button type="button" class="color-chip-remove" title="Remove color"><i class="fa-solid fa-xmark"></i></button>
        `;
        chip.querySelector('.color-chip-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            chip.remove();
        });
        grid.appendChild(chip);
        nameInput.value = '';
    }

    addBtn.addEventListener('click', addCustomColor);
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); }
    });
}

// â”€â”€ Payment Methods Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderPaymentMethods() {
    const pmContainer = document.getElementById('payment-methods-list');
    if (!pmContainer) return;
    
    const snapshot = await getDocs(collection(db, 'payment_methods'));
    let html = '';
    snapshot.forEach(doc => {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <span>${doc.data().name}</span>
                <button onclick="window.deletePaymentMethod('${doc.id}')" style="background:none; border:none; color:#ff4757; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    pmContainer.innerHTML = html || '<div style="color:#aaa;">No payment methods configured.</div>';
}

window.addPaymentMethod = async () => {
    const name = prompt("Enter new Payment Method name (e.g. PayPal, Bank Transfer):");
    if(name) {
        await addDoc(collection(db, 'payment_methods'), { name });
        renderPaymentMethods();
    }
};

window.deletePaymentMethod = async (id) => {
    await deleteDoc(doc(db, 'payment_methods', id));
    renderPaymentMethods();
};

// â”€â”€ Orders Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderOrders() {
    const ordersContainer = document.getElementById('orders-list');
    if (!ordersContainer) return;

    const snapshot = await getDocs(collection(db, 'orders'));
    let html = '';
    snapshot.forEach(doc => {
        const order = doc.data();
        html += `
            <div style="background: rgba(25,25,25,0.6); padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                    <strong>Order: ${doc.id}</strong>
                    <span style="color:#aaa;">${new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div>Customer: ${order.fname} ${order.lname}</div>
                <div>Email: ${order.email}</div>
                <div>Address: ${order.address}, ${order.city}</div>
                <div>Payment Method: ${order.paymentMethod}</div>
                <div style="margin-top: 10px; color:#ff6a00; font-weight:bold;">Total: Rs. ${order.total}</div>
            </div>
        `;
    });
    ordersContainer.innerHTML = html || '<div style="color:#aaa;">No orders yet.</div>';
}

// â”€â”€ Social Media Links Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadSocialLinks() {
    const docSnap = await getDocs(collection(db, 'settings'));
    docSnap.forEach(doc => {
        if(doc.id === 'social') {
            const data = doc.data();
            if(document.getElementById('social-instagram')) document.getElementById('social-instagram').value = data.instagram || '';
            if(document.getElementById('social-facebook')) document.getElementById('social-facebook').value = data.facebook || '';
            if(document.getElementById('social-twitter')) document.getElementById('social-twitter').value = data.twitter || '';
        }
    });
}

window.saveSocialLinks = async () => {
    const instagram = document.getElementById('social-instagram').value.trim();
    const facebook = document.getElementById('social-facebook').value.trim();
    const twitter = document.getElementById('social-twitter').value.trim();
    
    try {
        await setDoc(doc(db, 'settings', 'social'), { instagram, facebook, twitter });
        showToast('Social links saved!', 'success');
    } catch(e) {
        console.error(e);
        showToast('Error saving links.', 'error');
    }
};

// â”€â”€ Logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.logoutAdmin = () => {
    signOut(auth);
};

// â”€â”€ Initialise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('DOMContentLoaded', () => {
    initImageTabs();
    initForm();
    initColorAdder();
});


