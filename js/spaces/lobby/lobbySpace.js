(function() {
    const LobbySpace = {
        _active: false,
        _currentScreen: null,
        _screens: {
            'intro': { id: 'intro-screen', frag: 'fragments/intro.html', altFrag: 'fragments/lobby/intro.html' },
            'settings': { id: 'settings-screen', frag: 'fragments/settings.html', altFrag: 'fragments/lobby/settings.html' },
            'bestiary': { id: 'bestiary-screen', frag: 'fragments/bestiary.html', altFrag: 'fragments/lobby/bestiary.html' },
            'achievements': { id: 'achievements-screen', frag: 'fragments/achievements.html', altFrag: 'fragments/lobby/achievements.html' },
            'adventure-setup': { id: 'adventure-setup-screen', frag: 'fragments/adventure-setup.html', altFrag: 'fragments/lobby/adventure-setup.html' }
        },

        async activate(params) {
            this._active = true;

            const screenName = (params && params.screen) || 'intro';
            await this.showScreen(screenName, params);

            try {
                if (window.eventBus) {
                    window.eventBus.emit('lobby:activated', { params });
                }
            } catch (e) {}
        },

        async deactivate() {
            this._active = false;
            this._hideAllScreens();

            try {
                if (window.eventBus) {
                    window.eventBus.emit('lobby:deactivated');
                }
            } catch (e) {}
        },

        async showScreen(screenName, params) {
            const screenConfig = this._screens[screenName];
            if (!screenConfig) {
                console.warn('[LobbySpace] Unknown screen:', screenName);
                return;
            }

            await this._ensureScreenLoaded(screenConfig);
            this._hideAllScreens();

            const el = document.getElementById(screenConfig.id);
            if (el) {
                el.classList.add('active');
                el.style.display = 'flex';
            }

            this._currentScreen = screenName;

            if (window.AppState) {
                window.AppState.screen = screenName;
            }

            this._onScreenShown(screenName, params);

            try {
                if (window.eventBus) {
                    window.eventBus.emit('lobby:screenChanged', { screen: screenName, params });
                }
            } catch (e) {}
        },

        async _ensureScreenLoaded(screenConfig) {
            if (document.getElementById(screenConfig.id)) return;

            try {
                const container = this._getScreenContainer();
                const res = await fetch(screenConfig.frag, { cache: 'no-store' });
                if (!res.ok) throw new Error('HTTP ' + res.status);

                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');

                doc.querySelectorAll('template').forEach(t => {
                    document.body.appendChild(t);
                });

                const el = doc.getElementById(screenConfig.id) || doc.querySelector('.screen');
                if (el && container) {
                    container.appendChild(el);
                }
            } catch (e) {
                console.error('[LobbySpace] Failed to load screen:', screenConfig.id, e);
            }
        },

        _getScreenContainer() {
            if (window.SpaceManager) {
                return window.SpaceManager.getScreenContainer('lobby');
            }
            return document.getElementById('lobby-space');
        },

        _hideAllScreens() {
            const container = this._getScreenContainer();
            if (container) {
                container.querySelectorAll('.screen').forEach(s => {
                    s.classList.remove('active');
                    s.style.display = 'none';
                });
            }
        },

        _onScreenShown(screenName, params) {
            switch (screenName) {
                case 'intro':
                    break;
                case 'settings':
                    try {
                        if (typeof renderSettingsUI === 'function') {
                            renderSettingsUI();
                        }
                    } catch (e) {}
                    break;
                case 'bestiary':
                    try {
                        if (typeof refreshBestiaryList === 'function') {
                            refreshBestiaryList();
                        }
                    } catch (e) {}
                    break;
                case 'achievements':
                    try {
                        if (typeof renderAchievementsGrid === 'function') {
                            renderAchievementsGrid();
                        }
                    } catch (e) {}
                    break;
                case 'adventure-setup':
                    try {
                        if (typeof loadDefaultAdventure === 'function') {
                            loadDefaultAdventure();
                        }
                    } catch (e) {}
                    break;
            }
        },

        getCurrentScreen() {
            return this._currentScreen;
        },

        isActive() {
            return this._active;
        },

        async navigateTo(screenName, params) {
            if (!this._active) {
                if (window.GameOrchestrator) {
                    await window.GameOrchestrator.switchSpace('lobby', { screen: screenName, ...params });
                }
                return;
            }
            await this.showScreen(screenName, params);
        },

        async exitToIntro(confirmRequired) {
            if (confirmRequired && window.GameOrchestrator) {
                const proceed = await window.GameOrchestrator.requestConfirmExit();
                if (!proceed) return;
            }
            await this.showScreen('intro');
        }
    };

    window.LobbySpace = LobbySpace;

    window.showSettings = async function() {
        if (window.GameOrchestrator && window.GameOrchestrator.getCurrentSpace() !== 'lobby') {
            await window.GameOrchestrator.switchSpace('lobby', { screen: 'settings' });
        } else if (window.LobbySpace) {
            await window.LobbySpace.showScreen('settings');
        }
    };

    window.showBestiary = async function() {
        if (window.GameOrchestrator && window.GameOrchestrator.getCurrentSpace() !== 'lobby') {
            await window.GameOrchestrator.switchSpace('lobby', { screen: 'bestiary' });
        } else if (window.LobbySpace) {
            await window.LobbySpace.showScreen('bestiary');
        }
    };

    window.showAchievements = async function() {
        if (window.GameOrchestrator && window.GameOrchestrator.getCurrentSpace() !== 'lobby') {
            await window.GameOrchestrator.switchSpace('lobby', { screen: 'achievements' });
        } else if (window.LobbySpace) {
            await window.LobbySpace.showScreen('achievements');
        }
    };
})();
