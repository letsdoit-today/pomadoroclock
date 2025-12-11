import * as vscode from 'vscode';
import { PomodoroTimer } from './timer';
import { StatusBarManager } from './statusBar';
import { NotificationManager } from './notification';
import { DataManager } from './data';

export function activate(context: vscode.ExtensionContext) {
    console.log('番茄时钟插件已激活');

    // 初始化管理器
    const dataManager = new DataManager(context.globalState);
    const notificationManager = new NotificationManager();
    const statusBarManager = new StatusBarManager();
    const pomodoroTimer = new PomodoroTimer(dataManager, notificationManager, statusBarManager, context.extensionUri);

    // 注册命令
    const startCommand = vscode.commands.registerCommand('pomodoro-clock.start', () => {
        pomodoroTimer.startWork();
    });

    const pauseCommand = vscode.commands.registerCommand('pomodoro-clock.pause', () => {
        pomodoroTimer.pause();
    });

    const resumeCommand = vscode.commands.registerCommand('pomodoro-clock.resume', () => {
        pomodoroTimer.resume();
    });

    const toggleCommand = vscode.commands.registerCommand('pomodoro-clock.toggle', () => {
        const currentState = pomodoroTimer.getState();
        
        if (currentState === 'idle') {
            // 空闲状态：开始番茄
            pomodoroTimer.startWork();
        } else if (currentState === 'paused') {
            // 暂停状态：继续番茄
            pomodoroTimer.resume();
        } else if (currentState === 'working' || currentState === 'shortBreak' || currentState === 'longBreak') {
            // 工作/休息状态：暂停番茄
            pomodoroTimer.pause();
        } else {
            vscode.window.showInformationMessage('当前状态不支持切换操作');
        }
    });

    const cancelCommand = vscode.commands.registerCommand('pomodoro-clock.cancel', () => {
        pomodoroTimer.cancel();
    });

    const showPanelCommand = vscode.commands.registerCommand('pomodoro-clock.showPanel', () => {
        pomodoroTimer.showPanel();
    });

    const showQuickPickCommand = vscode.commands.registerCommand('pomodoro-clock.showQuickPick', () => {
        statusBarManager.showQuickPick();
    });

    // 订阅事件
    context.subscriptions.push(
        startCommand,
        pauseCommand,
        resumeCommand,
        toggleCommand,
        cancelCommand,
        showPanelCommand,
        showQuickPickCommand,
        statusBarManager,
        pomodoroTimer
    );

    // 初始化状态栏
    statusBarManager.initialize();
    
    pomodoroTimer.updateStatusBar();

    // 恢复上次的状态（如果存在）
    pomodoroTimer.restoreState();
}

export function deactivate() {
    console.log('番茄时钟插件已停用');
}