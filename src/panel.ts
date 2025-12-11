import * as vscode from 'vscode';
import { PomodoroTimer } from './timer';

export class PomodoroPanel {
    public static currentPanel: PomodoroPanel | undefined;
    public static readonly viewType = 'pomodoroClock';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _timer: PomodoroTimer;

    public static createOrShow(extensionUri: vscode.Uri, timer: PomodoroTimer): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果已经存在面板，则显示它
        if (PomodoroPanel.currentPanel) {
            PomodoroPanel.currentPanel._panel.reveal(column);
            return;
        }

        // 否则创建新面板
        const panel = vscode.window.createWebviewPanel(
            PomodoroPanel.viewType,
            '番茄时钟面板',
            column || vscode.ViewColumn.One,
            {
                // 启用JavaScript
                enableScripts: true,
                // 限制WebView可以访问的资源
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out/compiled')
                ]
            }
        );

        PomodoroPanel.currentPanel = new PomodoroPanel(panel, extensionUri, timer);
    }

    public static kill(): void {
        PomodoroPanel.currentPanel?.dispose();
        PomodoroPanel.currentPanel = undefined;
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, timer: PomodoroTimer): void {
        PomodoroPanel.currentPanel = new PomodoroPanel(panel, extensionUri, timer);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, timer: PomodoroTimer) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._timer = timer;

        // 设置WebView的HTML内容
        this._update();

        // 监听面板关闭事件
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 处理WebView消息
        this._panel.webview.onDidReceiveMessage(
            async (data) => {
                switch (data.type) {
                case 'toggleTimer':
                    const currentState = this._timer.getState();
                    if (currentState === 'idle') {
                        this._timer.startWork();
                    } else if (currentState === 'paused') {
                        this._timer.resume();
                    } else if (currentState === 'working' || currentState === 'shortBreak' || currentState === 'longBreak') {
                        this._timer.pause();
                    }
                    break;
                case 'cancelTimer':
                    this._timer.cancel();
                    break;
                case 'refresh':
                    this._update();
                    break;
            }
            },
            null,
            this._disposables
        );

        // 定时更新面板内容
        const intervalId = setInterval(() => {
            this._update();
        }, 1000);

        this._disposables.push({
            dispose: () => clearInterval(intervalId)
        });
    }

    public dispose(): void {
        PomodoroPanel.currentPanel = undefined;

        // 清理资源
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(): void {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview(): string {
        // 获取当前状态
        const statusText = this._timer.getStatusText();
        const tooltipText = this._timer.getTooltipText();
        const stateText = this._timer.getStateText();

        return `<!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>番茄时钟面板</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    .container {
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 10px;
                    }
                    .status-section {
                        background: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        padding: 15px;
                        margin-bottom: 15px;
                    }
                    .status-item {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                    }
                    .status-label {
                        font-weight: bold;
                        color: var(--vscode-descriptionForeground);
                    }
                    .status-value {
                        color: var(--vscode-foreground);
                    }
                    .timer-display {
                        font-size: 2em;
                        text-align: center;
                        margin: 20px 0;
                        font-family: 'Courier New', monospace;
                        font-weight: bold;
                    }
                    .controls {
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                        margin-top: 20px;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    button:disabled {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        cursor: not-allowed;
                    }
                    .state-indicator {
                        text-align: center;
                        font-size: 1.2em;
                        margin: 10px 0;
                        padding: 5px;
                        border-radius: 4px;
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍅 番茄时钟</h1>
                    </div>
                    
                    <div class="timer-display">${statusText}</div>
                    
                    <div class="state-indicator">${stateText}</div>
                    
                    <div class="status-section">
                        <div class="status-item">
                            <span class="status-label">今日完成番茄:</span>
                            <span class="status-value">${this._timer.getCompletedPomodoros()}个</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">连续番茄:</span>
                            <span class="status-value">${this._timer.getConsecutivePomodoros()}个</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">当前状态:</span>
                            <span class="status-value">${stateText}</span>
                        </div>
                    </div>
                    
                    <div class="controls">
                        <button onclick="toggleTimer()">
                            ${this._timer.getState() === 'idle' ? '开始工作' : 
                              this._timer.getState() === 'paused' ? '继续' : 
                              '暂停'}
                        </button>
                        ${this._timer.getState() !== 'idle' ? '<button onclick="cancelTimer()">取消</button>' : ''}
                        <button onclick="refresh()">刷新</button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function toggleTimer() {
                        vscode.postMessage({ type: 'toggleTimer' });
                    }
                    
                    function cancelTimer() {
                        vscode.postMessage({ type: 'cancelTimer' });
                    }
                    
                    function refresh() {
                        vscode.postMessage({ type: 'refresh' });
                    }
                </script>
            </body>
            </html>`;
    }
}