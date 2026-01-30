(function() {
    const SpaceManager = {
        _spaces: {},
        _activeSpace: null,
        _container: null,

        init() {
            this._container = document.getElementById('game-spaces');
            this._registerDefaultSpaces();
        },

        _registerDefaultSpaces() {
            const spaceElements = document.querySelectorAll('.game-space');
            spaceElements.forEach(el => {
                const spaceId = el.dataset.space;
                if (spaceId) {
                    this._spaces[spaceId] = {
                        id: spaceId,
                        element: el,
                        controller: null,
                        active: false
                    };
                }
            });
        },

        registerController(spaceId, controller) {
            if (this._spaces[spaceId]) {
                this._spaces[spaceId].controller = controller;
            }
        },

        getSpace(spaceId) {
            return this._spaces[spaceId] || null;
        },

        getActiveSpace() {
            return this._activeSpace;
        },

        getActiveSpaceId() {
            return this._activeSpace ? this._activeSpace.id : null;
        },

        getScreenContainer(spaceId) {
            const space = this._spaces[spaceId];
            if (space && space.element) {
                return space.element.querySelector('.space-screens') || space.element;
            }
            return null;
        },

        async activateSpace(spaceId, params) {
            const space = this._spaces[spaceId];
            if (!space) {
                console.error('[SpaceManager] Space not found:', spaceId);
                return false;
            }

            if (this._activeSpace && this._activeSpace.id !== spaceId) {
                await this.deactivateSpace(this._activeSpace.id);
            }

            space.active = true;
            space.element.classList.add('active');
            space.element.style.display = '';

            if (space.controller && typeof space.controller.activate === 'function') {
                try {
                    await space.controller.activate(params);
                } catch (e) {
                    console.error('[SpaceManager] Controller activation failed:', spaceId, e);
                }
            }

            this._activeSpace = space;

            try {
                if (window.eventBus) {
                    window.eventBus.emit('space:activated', { spaceId, params });
                }
            } catch (e) {}

            return true;
        },

        async deactivateSpace(spaceId) {
            const space = this._spaces[spaceId];
            if (!space || !space.active) return;

            if (space.controller && typeof space.controller.deactivate === 'function') {
                try {
                    await space.controller.deactivate();
                } catch (e) {
                    console.error('[SpaceManager] Controller deactivation failed:', spaceId, e);
                }
            }

            space.active = false;
            space.element.classList.remove('active');
            space.element.style.display = 'none';

            if (this._activeSpace && this._activeSpace.id === spaceId) {
                this._activeSpace = null;
            }

            try {
                if (window.eventBus) {
                    window.eventBus.emit('space:deactivated', { spaceId });
                }
            } catch (e) {}
        },

        hideAllSpaces() {
            Object.values(this._spaces).forEach(space => {
                space.active = false;
                space.element.classList.remove('active');
                space.element.style.display = 'none';
            });
            this._activeSpace = null;
        },

        getAllSpaceIds() {
            return Object.keys(this._spaces);
        }
    };

    window.SpaceManager = SpaceManager;
})();
