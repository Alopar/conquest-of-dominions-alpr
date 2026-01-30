(function() {
    const Layers = {
        _modalLayer: null,
        _toastLayer: null,
        _tooltipLayer: null,
        _loadingOverlay: null,

        init() {
            this._modalLayer = document.getElementById('modal-layer');
            this._toastLayer = document.getElementById('toast-layer');
            this._tooltipLayer = document.getElementById('tooltip-layer');
            this._loadingOverlay = document.getElementById('loading-overlay');
        },

        getModalLayer() {
            if (!this._modalLayer) {
                this._modalLayer = document.getElementById('modal-layer');
            }
            return this._modalLayer || document.body;
        },

        getToastLayer() {
            if (!this._toastLayer) {
                this._toastLayer = document.getElementById('toast-layer');
            }
            return this._toastLayer || document.body;
        },

        getTooltipLayer() {
            if (!this._tooltipLayer) {
                this._tooltipLayer = document.getElementById('tooltip-layer');
            }
            return this._tooltipLayer || document.body;
        },

        showLoading(message) {
            if (!this._loadingOverlay) {
                this._loadingOverlay = document.getElementById('loading-overlay');
            }
            if (this._loadingOverlay) {
                this._loadingOverlay.style.display = 'flex';
                const msgEl = this._loadingOverlay.querySelector('.loading-message');
                if (msgEl && message) {
                    msgEl.textContent = message;
                }
            }
        },

        hideLoading() {
            if (!this._loadingOverlay) {
                this._loadingOverlay = document.getElementById('loading-overlay');
            }
            if (this._loadingOverlay) {
                this._loadingOverlay.style.display = 'none';
            }
        },

        clearAll() {
            if (this._modalLayer) {
                while (this._modalLayer.firstChild) {
                    this._modalLayer.removeChild(this._modalLayer.firstChild);
                }
            }
            if (this._toastLayer) {
                while (this._toastLayer.firstChild) {
                    this._toastLayer.removeChild(this._toastLayer.firstChild);
                }
            }
            if (this._tooltipLayer) {
                while (this._tooltipLayer.firstChild) {
                    this._tooltipLayer.removeChild(this._tooltipLayer.firstChild);
                }
            }
        }
    };

    window.Layers = Layers;
})();
