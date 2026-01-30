(function() {
    const GameOrchestrator = {
        _currentSpace: null,
        _pendingData: {},
        _listeners: {},
        _initialized: false,

        async init() {
            if (this._initialized) return;

            if (window.SpaceManager) {
                window.SpaceManager.init();
            }

            if (window.Layers) {
                window.Layers.init();
            }

            this._registerSpaceControllers();
            this._initialized = true;

            try {
                if (window.eventBus) {
                    window.eventBus.emit('orchestrator:ready');
                }
            } catch (e) {}
        },

        _registerSpaceControllers() {
            if (window.SpaceManager) {
                if (window.LobbySpace) {
                    window.SpaceManager.registerController('lobby', window.LobbySpace);
                }
                if (window.AdventureSpace) {
                    window.SpaceManager.registerController('adventure', window.AdventureSpace);
                }
                if (window.BattleSpace) {
                    window.SpaceManager.registerController('battle', window.BattleSpace);
                }
            }
        },

        async switchSpace(spaceId, params) {
            const prevSpace = this._currentSpace;

            this._emit('space:beforeSwitch', {
                from: prevSpace,
                to: spaceId,
                params: params || {}
            });

            const mergedParams = Object.assign({}, this._pendingData[spaceId] || {}, params || {});
            delete this._pendingData[spaceId];

            if (window.Layers) {
                window.Layers.clearAll();
            }

            if (window.SpaceManager) {
                const success = await window.SpaceManager.activateSpace(spaceId, mergedParams);
                if (success) {
                    this._currentSpace = spaceId;

                    if (window.AppState) {
                        window.AppState.space = spaceId;
                    }

                    this._emit('space:afterSwitch', {
                        from: prevSpace,
                        to: spaceId,
                        params: mergedParams
                    });

                    return true;
                }
            }

            return false;
        },

        getCurrentSpace() {
            return this._currentSpace;
        },

        passData(spaceId, data) {
            if (!this._pendingData[spaceId]) {
                this._pendingData[spaceId] = {};
            }
            Object.assign(this._pendingData[spaceId], data);
        },

        getPendingData(spaceId) {
            return this._pendingData[spaceId] || null;
        },

        clearPendingData(spaceId) {
            if (spaceId) {
                delete this._pendingData[spaceId];
            } else {
                this._pendingData = {};
            }
        },

        on(event, handler) {
            if (!this._listeners[event]) {
                this._listeners[event] = [];
            }
            this._listeners[event].push(handler);
            return () => this.off(event, handler);
        },

        off(event, handler) {
            if (!this._listeners[event]) return;
            const idx = this._listeners[event].indexOf(handler);
            if (idx >= 0) {
                this._listeners[event].splice(idx, 1);
            }
        },

        _emit(event, data) {
            const handlers = this._listeners[event];
            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        handler(data);
                    } catch (e) {
                        console.error('[Orchestrator] Event handler error:', event, e);
                    }
                });
            }

            try {
                if (window.eventBus) {
                    window.eventBus.emit('orchestrator:' + event, data);
                }
            } catch (e) {}
        },

        async toLobby(params) {
            return this.switchSpace('lobby', params);
        },

        async toAdventure(params) {
            return this.switchSpace('adventure', params);
        },

        async toBattle(params) {
            return this.switchSpace('battle', params);
        },

        requestConfirmExit(message) {
            return new Promise((resolve) => {
                if (window.UI && typeof window.UI.showModal === 'function') {
                    const h = window.UI.showModal(
                        message || 'Игровой прогресс будет потерян. Продолжить?',
                        {
                            type: 'dialog',
                            title: 'Подтверждение',
                            yesText: 'Да',
                            noText: 'Отмена'
                        }
                    );
                    h.closed.then(result => resolve(!!result));
                } else {
                    resolve(confirm(message || 'Игровой прогресс будет потерян. Продолжить?'));
                }
            });
        }
    };

    window.GameOrchestrator = GameOrchestrator;
})();
