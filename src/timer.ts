import * as vscode from 'vscode';
import { StatusBarManager } from './statusBar';
import { NotificationManager } from './notification';
import { DataManager } from './data';
import { PomodoroPanel } from './panel';

export enum TimerState {
    IDLE = 'idle',
    WORKING = 'working',
    SHORT_BREAK = 'shortBreak',
    LONG_BREAK = 'longBreak',
    PAUSED = 'paused'
}

export interface TimerConfig {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
    enableSound: boolean;
    enableNotification: boolean;
}

export class PomodoroTimer implements vscode.Disposable {
    private state: TimerState = TimerState.IDLE;
    private remainingTime: number = 0;
    private totalDuration: number = 0;
    private intervalId: NodeJS.Timeout | null = null;
    private completedPomodoros: number = 0;
    private consecutivePomodoros: number = 0;
    private startTime: number | null = null;
    private pauseTime: number | null = null;
    private previousState: TimerState = TimerState.IDLE;

    constructor(
        private dataManager: DataManager,
        private notificationManager: NotificationManager,
        private statusBarManager: StatusBarManager,
        private extensionUri: vscode.Uri
    ) {}

    /**
     * 开始工作计时
     */
    public startWork(): void {
        if (this.state === TimerState.WORKING) {
            vscode.window.showInformationMessage('番茄时钟已经在工作中');
            return;
        }

        this.stopTimer();
        
        const config = this.getConfig();
        this.totalDuration = config.workDuration * 60;
        this.remainingTime = this.totalDuration;
        this.state = TimerState.WORKING;
        this.startTime = Date.now();
        
        this.startTimer();
        this.updateStatusBar();
        
        vscode.window.showInformationMessage(`开始工作番茄 (${config.workDuration}分钟)`);
    }

    /**
     * 开始计时（startWork的别名）
     */
    public start(): void {
        this.startWork();
    }

    /**
     * 开始休息计时
     */
    private startBreak(): void {
        this.stopTimer();
        
        const config = this.getConfig();
        const isLongBreak = this.consecutivePomodoros >= config.longBreakInterval;
        
        if (isLongBreak) {
            this.totalDuration = config.longBreakDuration * 60;
            this.state = TimerState.LONG_BREAK;
            vscode.window.showInformationMessage(`开始长休息 (${config.longBreakDuration}分钟)`);
        } else {
            this.totalDuration = config.shortBreakDuration * 60;
            this.state = TimerState.SHORT_BREAK;
            vscode.window.showInformationMessage(`开始短休息 (${config.shortBreakDuration}分钟)`);
        }
        
        this.remainingTime = this.totalDuration;
        this.startTime = Date.now();
        this.startTimer();
        this.updateStatusBar();
    }

    /**
     * 暂停计时
     */
    public pause(): void {
        if (this.state !== TimerState.WORKING && this.state !== TimerState.SHORT_BREAK && this.state !== TimerState.LONG_BREAK) {
            vscode.window.showInformationMessage('当前状态无法暂停');
            return;
        }

        this.stopTimer();
        this.previousState = this.state; // 保存暂停前的状态
        this.pauseTime = Date.now();
        this.state = TimerState.PAUSED;
        this.updateStatusBar();
        
        vscode.window.showInformationMessage('番茄时钟已暂停');
    }

    /**
     * 继续计时
     */
    public resume(): void {
        if (this.state !== TimerState.PAUSED) {
            vscode.window.showInformationMessage('当前状态无法继续');
            return;
        }

        if (!this.pauseTime) {
            vscode.window.showInformationMessage('无法继续，暂停时间信息丢失');
            return;
        }

        // 恢复计时器
        this.state = this.previousState;
        this.pauseTime = null;
        this.startTimer();
        this.updateStatusBar();
        
        vscode.window.showInformationMessage('番茄时钟已继续');
    }

    /**
     * 获取当前状态
     */
    public getState(): TimerState {
        return this.state;
    }

    /**
     * 获取暂停前的状态
     */
    private getPreviousState(): TimerState {
        return this.previousState;
    }

    /**
     * 取消计时
     */
    public cancel(): void {
        if (this.state === TimerState.IDLE) {
            vscode.window.showInformationMessage('番茄时钟当前为空闲状态');
            return;
        }

        this.stopTimer();
        
        // 如果是工作中取消，不记录完成番茄
        if (this.state === TimerState.WORKING) {
            this.consecutivePomodoros = 0;
        }
        
        this.resetTimer();
        this.updateStatusBar();
        
        vscode.window.showInformationMessage('番茄时钟已取消');
    }

    /**
     * 显示面板
     */
    public showPanel(): void {
        PomodoroPanel.createOrShow(this.extensionUri, this);
    }

    /**
     * 恢复状态
     */
    public restoreState(): void {
        const savedState = this.dataManager.getTimerState();
        if (savedState) {
            this.state = savedState.state;
            this.remainingTime = savedState.remainingTime;
            this.totalDuration = savedState.totalDuration;
            this.completedPomodoros = savedState.completedPomodoros;
            this.consecutivePomodoros = savedState.consecutivePomodoros;
            
            if (this.state === TimerState.WORKING || this.state === TimerState.SHORT_BREAK || this.state === TimerState.LONG_BREAK) {
                // 计算暂停的时间
                const elapsed = Math.floor((Date.now() - savedState.timestamp) / 1000);
                this.remainingTime = Math.max(0, this.remainingTime - elapsed);
                
                if (this.remainingTime > 0) {
                    this.startTimer();
                } else {
                    this.handleTimerEnd();
                }
            }
            
            this.updateStatusBar();
        }
    }

    /**
     * 更新状态栏
     */
    public updateStatusBar(): void {
        const statusText = this.getStatusText();
        const tooltip = this.getTooltipText();
        this.statusBarManager.update(statusText, tooltip);
        this.saveState();
    }

    /**
     * 开始计时器
     */
    private startTimer(): void {
        this.stopTimer();
        
        this.intervalId = setInterval(() => {
            this.remainingTime--;
            
            if (this.remainingTime <= 0) {
                this.handleTimerEnd();
            } else {
                this.updateStatusBar();
            }
        }, 1000);
    }

    /**
     * 停止计时器
     */
    private stopTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * 处理计时结束
     */
    private handleTimerEnd(): void {
        this.stopTimer();
        
        const config = this.getConfig();
        
        if (this.state === TimerState.WORKING) {
            // 完成一个番茄
            this.completedPomodoros++;
            this.consecutivePomodoros++;
            
            // 记录完成数据
            this.dataManager.recordPomodoro({
                startTime: this.startTime!,
                endTime: Date.now(),
                duration: config.workDuration,
                completed: true
            });
            
            // 发送提醒
            this.notificationManager.notifyWorkEnd(config);
            
            // 开始休息
            this.startBreak();
        } else if (this.state === TimerState.SHORT_BREAK || this.state === TimerState.LONG_BREAK) {
            // 休息结束
            this.notificationManager.notifyBreakEnd(config);
            
            // 如果是长休息，重置连续番茄计数
            if (this.state === TimerState.LONG_BREAK) {
                this.consecutivePomodoros = 0;
            }
            
            this.resetTimer();
            vscode.window.showInformationMessage('休息结束，准备开始下一个番茄吧！');
        }
        
        this.updateStatusBar();
    }

    /**
     * 重置计时器
     */
    private resetTimer(): void {
        this.state = TimerState.IDLE;
        this.remainingTime = 0;
        this.totalDuration = 0;
        this.startTime = null;
        this.pauseTime = null;
        this.previousState = TimerState.IDLE;
        this.saveState();
    }

    /**
     * 获取配置
     */
    private getConfig(): TimerConfig {
        const config = vscode.workspace.getConfiguration('pomodoroClock');
        return {
            workDuration: config.get('workDuration') || 25,
            shortBreakDuration: config.get('shortBreakDuration') || 5,
            longBreakDuration: config.get('longBreakDuration') || 15,
            longBreakInterval: config.get('longBreakInterval') || 4,
            enableSound: config.get('enableSound') !== false,
            enableNotification: config.get('enableNotification') !== false
        };
    }

    /**
     * 获取状态文本
     */
    public getStatusText(): string {
        const minutes = Math.floor(this.remainingTime / 60);
        const seconds = this.remainingTime % 60;
        const timeText = this.remainingTime > 0 ? `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : '00:00';
        
        switch (this.state) {
            case TimerState.WORKING:
                return `🍅 ${timeText}`;
            case TimerState.SHORT_BREAK:
                return `☕ ${timeText}`;
            case TimerState.LONG_BREAK:
                return `🌴 ${timeText}`;
            case TimerState.PAUSED:
                return `⏸️ ${timeText}`;
            default:
                return `🍅 空闲`;
        }
    }

    /**
     * 获取工具提示文本
     */
    public getTooltipText(): string {
        const today = new Date().toLocaleDateString('zh-CN');
        const todayData = this.dataManager.getTodayData();
        
        let tooltip = `番茄时钟\n`;
        tooltip += `今日完成: ${todayData.completedPomodoros}个番茄\n`;
        tooltip += `连续番茄: ${this.consecutivePomodoros}个\n`;
        
        if (this.state !== TimerState.IDLE) {
            const stateText = this.getStateText();
            tooltip += `当前状态: ${stateText}\n`;
            tooltip += `剩余时间: ${Math.floor(this.remainingTime / 60)}分${this.remainingTime % 60}秒`;
        }
        
        return tooltip;
    }

    /**
     * 获取状态消息
     */
    private getStatusMessage(): string {
        const todayData = this.dataManager.getTodayData();
        const stateText = this.getStateText();
        
        return `番茄时钟状态:
今日完成: ${todayData.completedPomodoros}个番茄
工作时长: ${Math.floor(todayData.totalWorkTime / 60)}分钟
连续番茄: ${this.consecutivePomodoros}个
当前状态: ${stateText}`;
    }

    /**
     * 获取状态文本
     */
    public getStateText(): string {
        switch (this.state) {
            case TimerState.WORKING:
                return '工作中';
            case TimerState.SHORT_BREAK:
                return '短休息中';
            case TimerState.LONG_BREAK:
                return '长休息中';
            case TimerState.PAUSED:
                return '已暂停';
            default:
                return '空闲';
        }
    }

    /**
     * 获取完成的番茄数
     */
    public getCompletedPomodoros(): number {
        return this.completedPomodoros;
    }

    /**
     * 获取连续番茄数
     */
    public getConsecutivePomodoros(): number {
        return this.consecutivePomodoros;
    }

    /**
     * 保存状态
     */
    private saveState(): void {
        if (this.state !== TimerState.IDLE) {
            this.dataManager.saveTimerState({
                state: this.state,
                remainingTime: this.remainingTime,
                totalDuration: this.totalDuration,
                completedPomodoros: this.completedPomodoros,
                consecutivePomodoros: this.consecutivePomodoros,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 清理资源
     */
    public dispose(): void {
        this.stopTimer();
        this.saveState();
    }
}