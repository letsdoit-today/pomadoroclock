import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        
        // 设置状态栏点击事件
        this.statusBarItem.command = 'pomodoro-clock.showQuickPick';
    }

    /**
     * 初始化状态栏
     */
    public initialize(): void {
        this.statusBarItem.show();
    }

    /**
     * 更新状态栏显示
     */
    public update(text: string, tooltip?: string): void {
        this.statusBarItem.text = text;
        if (tooltip) {
            this.statusBarItem.tooltip = tooltip;
        }
    }

    /**
     * 设置状态栏可见性
     */
    public setVisible(visible: boolean): void {
        if (visible) {
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    /**
     * 显示快速选择菜单
     */
    public async showQuickPick(): Promise<void> {
        const items = [
            {
                label: '$(play) 开始番茄',
                description: '开始一个新的番茄工作周期',
                action: 'start'
            },
            {
                label: '$(debug-pause) 暂停番茄',
                description: '暂停当前番茄计时',
                action: 'pause'
            },
            {
                label: '$(debug-continue) 继续番茄',
                description: '继续暂停的番茄计时',
                action: 'resume'
            },
            {
                label: '$(close) 取消番茄',
                description: '取消当前番茄计时',
                action: 'cancel'
            },
            {
                label: '$(dashboard) 显示面板',
                description: '打开番茄时钟详细面板',
                action: 'showPanel'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择番茄时钟操作',
            matchOnDescription: true
        });

        if (selected) {
            switch (selected.action) {
                case 'start':
                    vscode.commands.executeCommand('pomodoro-clock.start');
                    break;
                case 'pause':
                    vscode.commands.executeCommand('pomodoro-clock.pause');
                    break;
                case 'resume':
                    vscode.commands.executeCommand('pomodoro-clock.resume');
                    break;
                case 'cancel':
                    vscode.commands.executeCommand('pomodoro-clock.cancel');
                    break;
                case 'showPanel':
                    vscode.commands.executeCommand('pomodoro-clock.showPanel');
                    break;
            }
        }
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}