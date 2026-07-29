import { db, auth, getPayHereConfig } from './firebase-setup.js';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { sendOrderConfirmation, sendAdminOrderNotification } from './emailjs-config.js';
import './auth-header-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    const pmContainer = document.getElementById('payment-methods-container');
    const placeBtn = document.getElementById('place-order-btn');

    // Auto-fill user info if logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const fnameEl = document.getElementById('fname');
            const lnameEl = document.getElementById('lname');
            const emailEl = document.getElementById('email');
            if (user.displayName) {
                const nameParts = user.displayName.split(' ');
                if (nameParts.length > 1) {
                    fnameEl.value = nameParts[0];
                    lnameEl.value = nameParts.slice(1).join(' ');
                } else {
                    fnameEl.value = user.displayName;
                }
            }
            if (user.email) {
                emailEl.value = user.email;
            }
        }
    });

    // Fetch Payment Methods
    try {
        const pmRef = collection(db, 'payment_methods');
        const snapshot = await getDocs(pmRef);
        let methodsHTML = '';
        
        let methodsCount = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            methodsHTML += `
                <label class="payment-method">
                    <input type="radio" name="payment_method" value="${data.name || ''}" required>
                    <span>${data.name || ''}</span>
                </label>
            `;
            methodsCount++;
        });

        if (methodsCount === 0) {
            methodsHTML = `
                <label class="payment-method">
                    <input type="radio" name="payment_method" value="Cash on Delivery" required>
                    <span>Cash on Delivery</span>
                </label>
            `;
        }

        pmContainer.innerHTML = methodsHTML;
        placeBtn.disabled = false;

    } catch (e) {
        console.error("Error fetching payment methods", e);
        pmContainer.innerHTML = `
            <label class="payment-method">
                <input type="radio" name="payment_method" value="Cash on Delivery" required>
                <span>Cash on Delivery</span>
            </label>
        `;
        placeBtn.disabled = false;
    }

    // Handle Submission
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        placeBtn.disabled = true;
        placeBtn.textContent = 'Processing...';

        const user = auth.currentUser;
        const selectedMethod = document.querySelector('input[name="payment_method"]:checked').value;
        const isPayHere = selectedMethod.toLowerCase().includes('card') || selectedMethod.toLowerCase().includes('payhere');

        const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = cartTotal + 500;

        const formData = {
            fname: document.getElementById('fname').value,
            lname: document.getElementById('lname').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            zip: document.getElementById('zip').value,
            paymentMethod: selectedMethod,
            cart: cart,
            total: total,
            date: new Date().toISOString()
        };

        if (user) {
            formData.userId = user.uid;
        }

        try {
            // Save order first
            const orderRef = await addDoc(collection(db, 'orders'), formData);
            const orderId = orderRef.id;
            formData.orderId = orderId;

            if (isPayHere) {
                // PayHere flow
                const config = await getPayHereConfig();

                if (!config || !config.merchant_id) {
                    alert('PayHere payment is not configured yet. Please contact support.');
                    placeBtn.disabled = false;
                    placeBtn.textContent = 'Place Order Now';
                    return;
                }

                const payment = {
                    sandbox: config.sandbox !== false,
                    merchant_id: config.merchant_id,
                    return_url: window.location.href.split('?')[0],
                    cancel_url: window.location.href.split('?')[0],
                    notify_url: config.notify_url || '',
                    order_id: orderId,
                    items: cart.map(item => item.title).join(', '),
                    currency: 'LKR',
                    amount: total,
                    first_name: formData.fname,
                    last_name: formData.lname,
                    email: formData.email,
                    phone: config.merchant_phone || '',
                    address: formData.address,
                    city: formData.city,
                    country: 'Sri Lanka',
                    delivery_address: formData.address,
                    delivery_city: formData.city,
                    delivery_country: 'Sri Lanka'
                };

                payhere.startPayment(payment);
            } else {
                // Cash on Delivery flow
                await updateDoc(doc(db, 'orders', orderId), { status: 'pending' });

                try { await sendOrderConfirmation(formData); } catch(e) { console.error('Order confirmation failed:', e); }
                try { await sendAdminOrderNotification(formData); } catch(e) { console.error('Admin notification failed:', e); }

                localStorage.removeItem('cart');
                document.getElementById('checkout-form-container').style.display = 'none';
                document.getElementById('success-container').style.display = 'block';
            }

        } catch (error) {
            console.error("Error placing order:", error);
            alert("There was an error placing your order. Please try again.");
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order Now';
        }
    });
});

// PayHere callbacks
payhere.onCompleted = async function onPayHereCompleted(payment) {
    const orderId = payment.order_id;
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            paymentStatus: 'paid',
            paymentRef: payment.payment_id || '',
            status: 'paid'
        });

        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
            try { await sendOrderConfirmation({ orderId: orderId, ...orderSnap.data() }); } catch(e) { console.error('Order confirmation failed:', e); }
            try { await sendAdminOrderNotification({ orderId: orderId, ...orderSnap.data() }); } catch(e) { console.error('Admin notification failed:', e); }
        }

        localStorage.removeItem('cart');
        document.getElementById('checkout-form-container').style.display = 'none';
        document.getElementById('success-container').style.display = 'block';
    } catch (e) {
        console.error('Error updating order after payment:', e);
    }
};
payhere.onDismissed = function onPayHereDismissed() {
    const placeBtn = document.getElementById('place-order-btn');
    if (placeBtn) {
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order Now';
    }
};

payhere.onError = function onPayHereError(error) {
    console.error('PayHere error:', error);
    alert('Payment failed. Please try again.');
    const placeBtn = document.getElementById('place-order-btn');
    if (placeBtn) {
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order Now';
    }
};





