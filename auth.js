// auth.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const SUPABASE_URL = 'https://sohdgfnsxybzwippgxzs.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaGRnZm5zeHliendpcHBneHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDgzMTEsImV4cCI6MjA2MDQ4NDMxMX0.eObVuzOdSeL3QlR2f2EVZXp4NcgOBoDwwgFpSwLyTdw'; // Your Anon Key
    const GOOGLE_CLIENT_ID = "986166698260-0p28qdf9kfmaa1b3kj6p93bcpvrd5s2k.apps.googleusercontent.com"; // Your Google Client ID

    // --- State Variables ---
    let supabaseClient;
    let currentNonce;
    const googleButtonDiv = document.getElementById("googleLoginBtn"); // Google Sign-In Button Container
    const logoutButton = document.getElementById('logoutButton'); // Your Logout Button

    // --- Initialize Supabase ---
    try {
        if (typeof supabase !== 'undefined' && typeof supabase.createClient !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase Client Initialized.');
        } else {
            throw new Error('Supabase global object not found.');
        }
    } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
        displayError("Error initializing backend. Please try again later.");
        return; // Stop execution if Supabase fails
    }

    // --- Generate Nonce ---
    try {
        currentNonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
        console.log("Nonce generated.");
    } catch (e) {
        console.error("Crypto API not available, cannot generate nonce:", e);
        displayError("A security feature is not available in your browser.");
        currentNonce = null;
    }

    // --- Google Sign-In Callback ---
    async function handleCredentialResponse(response) {
        console.log("Google Credential Response Received");
        if (!supabaseClient || !currentNonce || !response?.credential) {
            console.error("Prerequisites failed for Supabase sign-in:", { supabaseClient, currentNonce, response });
            displayError("Login failed: Missing required information.");
            return;
        }

        console.log("Attempting Supabase sign-in with ID token...");
        try {
            const { data, error } = await supabaseClient.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: currentNonce, // Use the stored nonce
            });

            if (error) {
                console.error("Supabase signInWithIdToken error:", error);
                displayError(`Login Failed: ${error.message || 'Unknown error'}`);
            } else {
                console.log("Supabase login successful:", data);
                // UI update will be handled by onAuthStateChange or explicit call
            }
        } catch (e) {
            console.error("Exception during Supabase sign-in:", e);
            displayError("An unexpected error occurred during login.");
        }
    }

    // --- Initialize Google Sign-In ---
    function initializeGoogleSignIn() {
        if (!googleButtonDiv) {
            console.warn("Google button container 'buttonDiv' not found.");
            return; // Don't initialize if the container isn't there
        }
        try {
            if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
                console.error("Google Accounts library not loaded yet. Retrying...");
                setTimeout(initializeGoogleSignIn, 500); // Retry after delay
                return;
            }
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                // nonce: currentNonce // Nonce is verified by Supabase, not sent here
            });
            google.accounts.id.renderButton(
                googleButtonDiv,
                { theme: "outline", size: "large" }
            );
            // google.accounts.id.prompt(); // Optional: Display the One Tap prompt
            console.log("Google Sign-In Initialized and Button Rendered.");
        } catch (e) {
            console.error("Error initializing Google Sign-In:", e);
            displayError("Could not initialize Google Sign-In.");
        }
    }

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (!supabaseClient) return;
            console.log("Logout button clicked");
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error("Logout error:", error);
                displayError(`Logout failed: ${error.message}`);
            } else {
                console.log("Logout successful");
                // UI update handled by onAuthStateChange
            }
        });
    } else {
        console.warn("Logout button element not found.");
    }

    // --- Update UI Based on Session ---
    function updateUIBasedOnSession(session) {
        if (session) {
            // Logged In
            console.log('Auth state: Logged In');
            if (googleButtonDiv) googleButtonDiv.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'inline-block'; // Or 'block'
        } else {
            // Logged Out
            console.log('Auth state: Logged Out');
            if (googleButtonDiv) googleButtonDiv.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'none';
        }
    }

    // --- Helper to display errors (optional) ---
    function displayError(message) {
        // Replace with a more user-friendly error display if needed
        alert(message);
    }

    // --- Initial Setup & Listeners ---
    if (supabaseClient) {
        // Check initial session state
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            updateUIBasedOnSession(session);
        }).catch(error => {
            console.error("Error getting initial session:", error);
        });

        // Listen for changes in authentication state
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            console.log('Supabase auth state changed:', _event);
            updateUIBasedOnSession(session);
        });
    }

    // Initialize Google Sign-In once Supabase client is ready
    if (supabaseClient && currentNonce) {
        initializeGoogleSignIn();
    } else if (!currentNonce){
        // Handle case where nonce generation failed earlier
        console.error("Cannot initialize Google Sign-In due to missing nonce.");
    }

}); // End of DOMContentLoaded