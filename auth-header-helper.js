// auth-header-helper.js
// Updates the user icon in the header based on the Firebase Auth state
import { auth } from './firebase-setup.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        const userBtn = document.getElementById('header-user-btn');
        if (!userBtn) return;

        if (user) {
            userBtn.href = 'account.html';
            const name = user.displayName || user.email.split('@')[0];
            const initial = name.charAt(0).toUpperCase();
            userBtn.innerHTML = `<span style="font-weight:800; font-size:0.9rem; color:var(--accent-color);">${initial}</span>`;
            userBtn.title = `Logged in as ${name}`;
        } else {
            userBtn.href = 'login.html';
            userBtn.innerHTML = `<i class="fa-regular fa-user"></i>`;
            userBtn.title = 'Sign In';
        }
    });
});
