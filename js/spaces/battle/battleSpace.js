(function() {
    const BattleSpace = {
        _active: false,
        _currentScreen: null,
        _battleSource: null,
        _screens: {
            'battle': { id: 'battle-screen', frag: 'fragments/battle-screen.html' }
        },

        async activate(params) {
            this._active = true;

            this._battleSource = (params && params.source) || 'standalone';

            if (params && params.encounter) {
                this._setupBattleFromEncounter(params.encounter);
            }

            const screenName = (params && params.screen) || 'battle';
            await this.showScreen(screenName, params);

            try {
                if (window.eventBus) {
                    window.eventBus.emit('battle:activated', { params, source: this._battleSource });
                }
            } catch (e) {}
        },

        async deactivate() {
            this._active = false;
            this._hideAllScreens();

            try {
                if (window._stopAutoPlay) {
                    window._stopAutoPlay();
                }
            } catch (e) {}

            try {
                if (window.eventBus) {
                    window.eventBus.emit('battle:deactivated');
                }
            } catch (e) {}
        },

        async showScreen(screenName, params) {
            const screenConfig = this._screens[screenName];
            if (!screenConfig) {
                console.warn('[BattleSpace] Unknown screen:', screenName);
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
                    window.eventBus.emit('battle:screenChanged', { screen: screenName, params });
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
                console.error('[BattleSpace] Failed to load screen:', screenConfig.id, e);
            }
        },

        _getScreenContainer() {
            if (window.SpaceManager) {
                return window.SpaceManager.getScreenContainer('battle');
            }
            return document.getElementById('battle-space');
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
            if (screenName === 'battle') {
                this._initializeBattle(params);
            }
        },

        _setupBattleFromEncounter(encounter) {
            try {
                if (encounter.battleConfig) {
                    window.battleConfig = encounter.battleConfig;
                    window.battleConfigSource = 'adventure';
                }
            } catch (e) {
                console.error('[BattleSpace] Failed to setup battle config:', e);
            }
        },

        _initializeBattle(params) {
            try {
                if (window.Modifiers && typeof window.Modifiers.resetAndRecompute === 'function') {
                    window.Modifiers.resetAndRecompute();
                }
            } catch (e) {}

            try {
                if (typeof initializeArmies === 'function') {
                    initializeArmies();
                }
                if (typeof renderArmies === 'function') {
                    renderArmies();
                }
            } catch (e) {
                console.error('[BattleSpace] Failed to initialize battle:', e);
            }

            const logDiv = document.getElementById('battle-log');
            if (logDiv) {
                logDiv.innerHTML = '';
            }

            this._updateHomeButtonVisibility();
        },

        _updateHomeButtonVisibility() {
            const homeBtn = document.getElementById('battle-btn-home');
            if (homeBtn) {
                if (this._battleSource === 'adventure' || this._battleSource === 'raid') {
                    homeBtn.style.display = 'none';
                } else {
                    homeBtn.style.display = '';
                }
            }
        },

        getCurrentScreen() {
            return this._currentScreen;
        },

        getBattleSource() {
            return this._battleSource;
        },

        isActive() {
            return this._active;
        },

        async exitToLobby(confirmRequired) {
            if (confirmRequired && window.GameOrchestrator) {
                const proceed = await window.GameOrchestrator.requestConfirmExit();
                if (!proceed) return;
            }

            if (window.GameOrchestrator) {
                await window.GameOrchestrator.switchSpace('lobby', { screen: 'intro' });
            }
        },

        async returnToAdventure() {
            if (this._battleSource === 'adventure' || this._battleSource === 'raid') {
                if (window.GameOrchestrator) {
                    await window.GameOrchestrator.switchSpace('adventure', { screen: 'adventure-main' });
                }
            } else {
                await this.exitToLobby();
            }
        },

        async finishBattle() {
            if (typeof finishBattleToAdventure === 'function') {
                await finishBattleToAdventure();
            } else {
                await this.returnToAdventure();
            }
        }
    };

    window.BattleSpace = BattleSpace;

    window.showBattle = async function() {
        if (window.GameOrchestrator) {
            await window.GameOrchestrator.switchSpace('battle');
        } else if (window.BattleSpace) {
            await window.BattleSpace.showScreen('battle');
        }
    };
})();
