import { auth, db } from './firebase-setup.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html?redirect=account.html';
        return;
    }

    // Populate profile
    const name = user.displayName || user.email.split('@')[0];
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();

    await loadOrders(user.uid);
});

async function loadOrders(userId) {
    const container = document.getElementById('orders-list');
    try {
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', userId),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-orders">
                    <i class="fa-regular fa-bag-shopping"></i>
                    <p>No orders yet.</p>
                    <a href="index.html#products-section">
                        <i class="fa-solid fa-shirt"></i> Browse Collection
                    </a>
                </div>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const o = doc.data();
            const orderId = doc.id;
            const date = o.date ? new Date(o.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
            const status = o.paymentStatus || o.status || 'pending';
            const badgeClass = {
                pending: 'badge-pending',
                pending_payment: 'badge-pending',
                paid: 'badge-paid',
                shipped: 'badge-shipped',
                delivered: 'badge-delivered',
                cancelled: 'badge-cancelled',
                canceled: 'badge-cancelled'
            }[status] || 'badge-pending';

            const itemsHTML = (o.cart || []).map(item => `
                <div class="order-item">
                    <img src="${item.image || ''}" alt="${item.title}" onerror="this.style.display='none'">
                    <div>
                        <div class="order-item-name">${item.title}</div>
                        <div class="order-item-meta">Size: ${item.size} · Color: ${item.color} · Qty: ${item.quantity}</div>
                    </div>
                    <div class="order-item-price">Rs. ${(item.price * item.quantity).toLocaleString()}</div>
                </div>
            `).join('');

            html += `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Order #${orderId.slice(-8).toUpperCase()}</div>
                            <div class="order-date">${date}</div>
                        </div>
                        <span class="order-badge ${badgeClass}">${status.replace('_', ' ')}</span>
                    </div>
                    <div class="order-items">${itemsHTML}</div>
                    <div class="order-total">
                        <span>Total</span>
                        <span>Rs. ${(o.total || 0).toLocaleString()}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error('Error loading orders:', err);
        container.innerHTML = `<div class="empty-orders"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load orders.</p></div>`;
    }
}

window.doLogout = async function () {
    await signOut(auth);
    window.location.href = 'index.html';
};
