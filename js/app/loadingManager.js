(function() {
    const LoadingManager = {
        _progress: 0,
        _total: 0,
        _tasks: [],
        _onProgress: null,
        _onComplete: null,

        init(options) {
            this._progress = 0;
            this._total = 0;
            this._tasks = [];
            this._onProgress = (options && options.onProgress) || null;
            this._onComplete = (options && options.onComplete) || null;
        },

        addTask(name, weight) {
            const task = {
                name: name,
                weight: weight || 1,
                completed: false
            };
            this._tasks.push(task);
            this._total += task.weight;
            return task;
        },

        completeTask(task) {
            if (!task || task.completed) return;
            task.completed = true;
            this._progress += task.weight;
            this._updateProgress();
            if (this._progress >= this._total && this._onComplete) {
                this._onComplete();
            }
        },

        _updateProgress() {
            const percent = this._total > 0 ? Math.round((this._progress / this._total) * 100) : 0;
            if (this._onProgress) {
                this._onProgress(percent);
            }
            this._updateUI(percent);
        },

        _updateUI(percent) {
            const bar = document.querySelector('#app-loading .app-loading-bar');
            if (bar) {
                bar.style.width = percent + '%';
            }
            const text = document.querySelector('#app-loading .app-loading-text');
            if (text) {
                text.textContent = 'Загрузка... ' + percent + '%';
            }
        },

        showAppLoading() {
            const el = document.getElementById('app-loading');
            if (el) {
                el.style.display = 'flex';
            }
        },

        hideAppLoading() {
            const el = document.getElementById('app-loading');
            if (el) {
                el.style.display = 'none';
            }
        },

        showOverlay(message) {
            const el = document.getElementById('loading-overlay');
            if (el) {
                el.style.display = 'flex';
                const msgEl = el.querySelector('.loading-message');
                if (msgEl && message) {
                    msgEl.textContent = message;
                }
            }
        },

        hideOverlay() {
            const el = document.getElementById('loading-overlay');
            if (el) {
                el.style.display = 'none';
            }
        },

        async loadWithProgress(tasks) {
            this.init({
                onComplete: () => {
                    setTimeout(() => {
                        this.hideAppLoading();
                    }, 300);
                }
            });

            for (const taskDef of tasks) {
                const task = this.addTask(taskDef.name, taskDef.weight || 1);
                try {
                    if (taskDef.fn) {
                        await taskDef.fn();
                    }
                } catch (err) {
                    console.error('[LoadingManager] Task failed:', taskDef.name, err);
                }
                this.completeTask(task);
            }
        }
    };

    window.LoadingManager = LoadingManager;
})();
