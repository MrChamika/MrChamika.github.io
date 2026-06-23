import { db } from './firebase-setup.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    const pmContainer = document.getElementById('payment-methods-container');
    const placeBtn = document.getElementById('place-order-btn');

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
                    <input type="radio" name="payment_method" value="${data.name}" required>
                    <span>${data.name}</span>
                </label>
            `;
            methodsCount++;
        });

        if (methodsCount === 0) {
            // Fallback if admin hasn't set any up yet
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
        pmContainer.innerHTML = '<div style="color:red;">Failed to load payment options.</div>';
    }

    // Handle Submission
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        placeBtn.disabled = true;
        placeBtn.textContent = 'Processing...';

        const formData = {
            fname: document.getElementById('fname').value,
            lname: document.getElementById('lname').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            zip: document.getElementById('zip').value,
            paymentMethod: document.querySelector('input[name="payment_method"]:checked').value,
            cart: cart,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 500, // including shipping
            date: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, 'orders'), formData);
            
            // Clear cart and show success
            localStorage.removeItem('cart');
            document.getElementById('checkout-form-container').style.display = 'none';
            document.getElementById('success-container').style.display = 'block';

        } catch (error) {
            console.error("Error placing order:", error);
            alert("There was an error placing your order. Please try again.");
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order Now';
        }
    });
});
