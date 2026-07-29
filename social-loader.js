import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-setup.js';

async function loadSocialLinks() {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'social'));
        if (docSnap.exists()) {
            const data = docSnap.data();
            const inst = document.querySelectorAll('a[aria-label="Instagram"]');
            const fb = document.querySelectorAll('a[aria-label="Facebook"]');
            const tw = document.querySelectorAll('a[aria-label="Twitter"]');
            const tk = document.querySelectorAll('a[aria-label="TikTok"]');

            if (data.instagram) inst.forEach(el => el.href = data.instagram);
            if (data.facebook) fb.forEach(el => el.href = data.facebook);
            if (data.twitter) tw.forEach(el => el.href = data.twitter);
            if (data.tiktok) tk.forEach(el => el.href = data.tiktok);
        }
    } catch (e) {
        console.error("Could not load social links", e);
    }
}

document.addEventListener('DOMContentLoaded', loadSocialLinks);