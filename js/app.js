document.addEventListener('DOMContentLoaded', async function() {
    if (window.Bootstrap && typeof window.Bootstrap.init === 'function') {
        await window.Bootstrap.init();
    }
});
