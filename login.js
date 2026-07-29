import { auth, db } from './firebase-setup.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'account.html';
        window.location.href = redirect;
    }
});

// Save user profile to Firestore
async function saveUserToFirestore(user, displayName) {
    try {
        await setDoc(doc(db, 'users', user.uid), {
            displayName: displayName || user.displayName || '',
            email: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.error('Error saving user to Firestore:', e);
    }
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...'
        : (btnId === 'signin-btn'
            ? '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In'
            : '<i class="fa-solid fa-user-plus"></i> Create Account');
}

// Sign In
window.doSignIn = async function () {
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) { showError('Please enter your email and password.'); return; }

    setLoading('signin-btn', true);
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(result.user);
        showSuccess('Signed in! Redirecting...');
    } catch (err) {
        setLoading('signin-btn', false);
        showError(friendlyError(err.code));
    }
};

// Sign Up
window.doSignUp = async function () {
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!name)            { showError('Please enter your name.'); return; }
    if (!email)           { showError('Please enter your email.'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }

    setLoading('signup-btn', true);
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await saveUserToFirestore(result.user, name);
        showSuccess('Account created! Redirecting...');
    } catch (err) {
        setLoading('signup-btn', false);
        showError(friendlyError(err.code));
    }
};

// Google Sign In
window.doGoogleSignIn = async function () {
    try {
        const result = await signInWithPopup(auth, provider);
        await saveUserToFirestore(result.user);
        showSuccess('Signed in with Google! Redirecting...');
    } catch (err) {
        if (err.code === 'auth/popup-blocked') {
            showError('Popup blocked. Redirecting to Google sign-in...');
            await signInWithRedirect(auth, provider);
        } else if (err.code !== 'auth/popup-closed-by-user') {
            showError(friendlyError(err.code));
        }
    }
};

// Human-readable Firebase errors
function friendlyError(code) {
    const map = {
        'auth/user-not-found':     'No account found with this email.',
        'auth/wrong-password':     'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/email-already-in-use': 'This email is already registered. Try signing in.',
        'auth/weak-password':      'Password must be at least 6 characters.',
        'auth/invalid-email':      'Please enter a valid email address.',
        'auth/too-many-requests':  'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled. Please enable it in Firebase Console (Authentication > Sign-in providers).',
        'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site and try again.',
    };
    return map[code] || 'Something went wrong. Please try again.';
}
