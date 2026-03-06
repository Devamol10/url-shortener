// Add the refresh call before checking auth status

refreshAuth();

if (isAuth()) {
    // Proceed with authentication
} else {
    // Redirect to login
}