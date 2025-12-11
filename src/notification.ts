import * as vscode from 'vscode';
import { TimerConfig } from './timer';

export class NotificationManager {
    /**
     * 通知工作结束
     */
    public notifyWorkEnd(config: TimerConfig): void {
        const message = '工作时间结束，开始休息吧～';
        this.showNotification(message, config);
    }

    /**
     * 通知休息结束
     */
    public notifyBreakEnd(config: TimerConfig): void {
        const message = '休息时间结束，准备开始工作吧！';
        this.showNotification(message, config);
    }

    /**
     * 显示通知
     */
    private showNotification(message: string, config: TimerConfig): void {
        // 系统通知
        if (config.enableNotification) {
            vscode.window.showInformationMessage(message);
        }

        // 声音提醒（通过播放提示音实现）
        if (config.enableSound) {
            this.playSound();
        }
    }

    /**
     * 播放提示音
     */
    private playSound(): void {
        // 使用VS Code的提示音功能
        // 这里可以扩展为播放自定义声音文件
        // 目前使用VS Code内置的提示音
        vscode.window.showInformationMessage('🔔 时间到！');
    }

    /**
     * 显示错误通知
     */
    public showError(message: string): void {
        vscode.window.showErrorMessage(`番茄时钟错误: ${message}`);
    }

    /**
     * 显示警告通知
     */
    public showWarning(message: string): void {
        vscode.window.showWarningMessage(`番茄时钟提示: ${message}`);
    }
}