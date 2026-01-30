(function() {
    const AdventureSpace = {
        _active: false,
        _currentScreen: null,
        _currentSubscreen: null,
        _screens: {
            'adventure-main': { id: 'adventure-screen', frag: 'fragments/adventure-main.html' },
            'adventure-result': { id: 'adventure-result-screen', frag: 'fragments/adventure-result.html' }
        },
        _subscreens: ['map', 'army', 'hero', 'perks', 'tavern', 'raids', 'mods'],

        async activate(params) {
            this._active = true;

            const screenName = (params && params.screen) || 'adventure-main';
            await this.showScreen(screenName, params);

            try {
                if (window.eventBus) {
                    window.eventBus.emit('adventure:activated', { params });
                }
            } catch (e) {}
        },

        async deactivate() {
            this._active = false;
            this._hideAllScreens();

            try {
                if (window.eventBus) {
                    window.eventBus.emit('adventure:deactivated');
                }
            } catch (e) {}
        },

        async showScreen(screenName, params) {
            const screenConfig = this._screens[screenName];
            if (!screenConfig) {
                console.warn('[AdventureSpace] Unknown screen:', screenName);
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
                    window.eventBus.emit('adventure:screenChanged', { screen: screenName, params });
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
                console.error('[AdventureSpace] Failed to load screen:', screenConfig.id, e);
            }
        },

        _getScreenContainer() {
            if (window.SpaceManager) {
                return window.SpaceManager.getScreenContainer('adventure');
            }
            return document.getElementById('adventure-space');
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
            if (screenName === 'adventure-main') {
                const subscreen = (params && params.subscreen) || 'map';
                this.showSubscreen(subscreen);
            }
        },

        async showSubscreen(subscreenName) {
            if (!this._subscreens.includes(subscreenName)) {
                console.warn('[AdventureSpace] Unknown subscreen:', subscreenName);
                return;
            }

            this._currentSubscreen = subscreenName;

            if (window.AppState) {
                window.AppState.subscreen = subscreenName;
            }

            try {
                if (typeof renderAdventureSubscreen === 'function') {
                    renderAdventureSubscreen(subscreenName);
                }
            } catch (e) {
                console.error('[AdventureSpace] Failed to render subscreen:', subscreenName, e);
            }

            try {
                if (window.eventBus) {
                    window.eventBus.emit('adventure:subscreenChanged', { subscreen: subscreenName });
                }
            } catch (e) {}
        },

        getCurrentScreen() {
            return this._currentScreen;
        },

        getCurrentSubscreen() {
            return this._currentSubscreen;
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

        async startBattle(encounterData) {
            if (window.GameOrchestrator) {
                window.GameOrchestrator.passData('battle', {
                    source: 'adventure',
                    encounter: encounterData
                });
                await window.GameOrchestrator.switchSpace('battle');
            }
        },

        showResult(message) {
            this.showScreen('adventure-result', { message });
        }
    };

    window.AdventureSpace = AdventureSpace;

    window.showAdventure = async function() {
        if (window.GameOrchestrator) {
            await window.GameOrchestrator.switchSpace('adventure', { screen: 'adventure-main', subscreen: 'map' });
        } else if (window.AdventureSpace) {
            await window.AdventureSpace.showScreen('adventure-main', { subscreen: 'map' });
        }
    };

    window.showAdventureResult = async function(message) {
        if (window.GameOrchestrator && window.GameOrchestrator.getCurrentSpace() !== 'adventure') {
            await window.GameOrchestrator.switchSpace('adventure', { screen: 'adventure-result', message });
        } else if (window.AdventureSpace) {
            window.AdventureSpace.showResult(message);
        }
    };
})();
