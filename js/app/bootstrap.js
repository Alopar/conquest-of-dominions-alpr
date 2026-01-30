(function() {
    const Bootstrap = {
        _initialized: false,
        _gameReady: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            try {
                if (window.MobileWrapper && typeof window.MobileWrapper.init === 'function') {
                    window.MobileWrapper.init();
                }
            } catch (e) {
                console.warn('[Bootstrap] MobileWrapper init failed:', e);
            }

            if (window.LoadingManager) {
                window.LoadingManager.showAppLoading();
            }

            const tasks = [
                {
                    name: 'templates',
                    weight: 2,
                    fn: () => this._loadTemplates()
                },
                {
                    name: 'staticData',
                    weight: 3,
                    fn: () => this._initStaticData()
                },
                {
                    name: 'gameSettings',
                    weight: 1,
                    fn: () => this._initGameSettings()
                },
                {
                    name: 'achievements',
                    weight: 1,
                    fn: () => this._initAchievements()
                },
                {
                    name: 'settings',
                    weight: 1,
                    fn: () => this._initSettingsScreen()
                },
                {
                    name: 'orchestrator',
                    weight: 2,
                    fn: () => this._initOrchestrator()
                }
            ];

            if (window.LoadingManager) {
                await window.LoadingManager.loadWithProgress(tasks);
            } else {
                for (const task of tasks) {
                    try {
                        if (task.fn) await task.fn();
                    } catch (e) {
                        console.error('[Bootstrap] Task failed:', task.name, e);
                    }
                }
            }

            this._showGame();
            this._startApp();
        },

        async _loadTemplates() {
            if (window._templatesLoaded) return;
            try {
                const res = await fetch('fragments/templates.html', { cache: 'no-store' });
                if (res.ok) {
                    const html = await res.text();
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    doc.querySelectorAll('template').forEach(function(t) {
                        document.body.appendChild(t);
                    });
                    window._templatesLoaded = true;
                }
            } catch (e) {
                console.warn('[Bootstrap] Failed to load templates:', e);
            }
        },

        async _initStaticData() {
            try {
                if (window.StaticData && typeof window.StaticData.init === 'function') {
                    await window.StaticData.init();
                }
            } catch (e) {
                console.warn('[Bootstrap] StaticData init failed:', e);
            }
        },

        async _initGameSettings() {
            try {
                if (window.GameSettings && typeof window.GameSettings.init === 'function') {
                    await window.GameSettings.init();
                }
            } catch (e) {
                console.warn('[Bootstrap] GameSettings init failed:', e);
            }
        },

        async _initAchievements() {
            try {
                if (window.Achievements && typeof window.Achievements.init === 'function') {
                    await window.Achievements.init();
                }
            } catch (e) {
                console.warn('[Bootstrap] Achievements init failed:', e);
            }
        },

        async _initSettingsScreen() {
            try {
                if (typeof initializeSettings === 'function') {
                    await initializeSettings();
                }
            } catch (e) {
                console.warn('[Bootstrap] Settings screen init failed:', e);
            }
        },

        async _initOrchestrator() {
            try {
                if (window.GameOrchestrator && typeof window.GameOrchestrator.init === 'function') {
                    await window.GameOrchestrator.init();
                }
            } catch (e) {
                console.warn('[Bootstrap] Orchestrator init failed:', e);
            }
        },

        _showGame() {
            const game = document.getElementById('game');
            if (game) {
                game.style.display = '';
            }
            this._gameReady = true;
        },

        _startApp() {
            try {
                localStorage.removeItem('adventureState');
            } catch (e) {}

            try {
                if (window.GameOrchestrator && typeof window.GameOrchestrator.switchSpace === 'function') {
                    window.GameOrchestrator.switchSpace('lobby');
                    if (window.LobbySpace && typeof window.LobbySpace.showScreen === 'function') {
                        window.LobbySpace.showScreen('intro');
                    }
                } else if (window.Router && typeof window.Router.setScreen === 'function') {
                    window.Router.setScreen('intro');
                } else if (window.UI && typeof window.UI.ensureScreenLoaded === 'function') {
                    window.UI.ensureScreenLoaded('intro-screen', 'fragments/intro.html');
                    if (typeof window.showScreen === 'function') {
                        window.showScreen('intro-screen');
                    }
                }
            } catch (e) {
                console.error('[Bootstrap] Failed to start app:', e);
            }

            this._setupGlobalHandlers();
        },

        _setupGlobalHandlers() {
            try {
                window.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        if (window.UI && typeof window.UI.closeTopModal === 'function') {
                            window.UI.closeTopModal();
                            e.preventDefault();
                        }
                    }
                }, true);
            } catch (e) {}
        },

        isReady() {
            return this._gameReady;
        }
    };

    window.Bootstrap = Bootstrap;
})();
