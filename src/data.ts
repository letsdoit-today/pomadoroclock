import * as vscode from 'vscode';
import { TimerState } from './timer';

export interface PomodoroRecord {
    startTime: number;
    endTime: number;
    duration: number;
    completed: boolean;
}

export interface TodayData {
    completedPomodoros: number;
    totalWorkTime: number; // 分钟
}

export interface TimerStateData {
    state: TimerState;
    remainingTime: number;
    totalDuration: number;
    completedPomodoros: number;
    consecutivePomodoros: number;
    timestamp: number;
}

export class DataManager {
    private readonly POMODORO_RECORDS_KEY = 'pomodoroRecords';
    private readonly TIMER_STATE_KEY = 'timerState';

    constructor(private globalState: vscode.Memento) {}

    /**
     * 记录番茄数据
     */
    public recordPomodoro(record: PomodoroRecord): void {
        try {
            const records = this.getPomodoroRecords();
            records.push(record);
            this.globalState.update(this.POMODORO_RECORDS_KEY, records);
        } catch (error) {
            console.error('记录番茄数据失败:', error);
        }
    }

    /**
     * 获取所有番茄记录
     */
    public getPomodoroRecords(): PomodoroRecord[] {
        try {
            const records = this.globalState.get<PomodoroRecord[]>(this.POMODORO_RECORDS_KEY, []);
            return records;
        } catch (error) {
            console.error('获取番茄记录失败:', error);
            return [];
        }
    }

    /**
     * 获取今日数据
     */
    public getTodayData(): TodayData {
        const records = this.getPomodoroRecords();
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;

        const todayRecords = records.filter(record => 
            record.startTime >= todayStart && record.startTime < todayEnd && record.completed
        );

        const completedPomodoros = todayRecords.length;
        const totalWorkTime = todayRecords.reduce((total, record) => total + record.duration, 0);

        return {
            completedPomodoros,
            totalWorkTime
        };
    }

    /**
     * 保存计时器状态
     */
    public saveTimerState(stateData: TimerStateData): void {
        try {
            this.globalState.update(this.TIMER_STATE_KEY, stateData);
        } catch (error) {
            console.error('保存计时器状态失败:', error);
        }
    }

    /**
     * 获取计时器状态
     */
    public getTimerState(): TimerStateData | null {
        try {
            return this.globalState.get<TimerStateData>(this.TIMER_STATE_KEY) || null;
        } catch (error) {
            console.error('获取计时器状态失败:', error);
            return null;
        }
    }

    /**
     * 清除所有数据
     */
    public clearAllData(): void {
        try {
            this.globalState.update(this.POMODORO_RECORDS_KEY, undefined);
            this.globalState.update(this.TIMER_STATE_KEY, undefined);
        } catch (error) {
            console.error('清除数据失败:', error);
        }
    }

    /**
     * 导出数据为CSV格式
     */
    public exportToCSV(): string {
        const records = this.getPomodoroRecords();
        let csv = '开始时间,结束时间,时长(分钟),状态\n';
        
        records.forEach(record => {
            const startTime = new Date(record.startTime).toLocaleString('zh-CN');
            const endTime = new Date(record.endTime).toLocaleString('zh-CN');
            const status = record.completed ? '完成' : '取消';
            csv += `${startTime},${endTime},${record.duration},${status}\n`;
        });
        
        return csv;
    }

    /**
     * 获取最近7天数据
     */
    public getLast7DaysData(): { date: string; completed: number; workTime: number }[] {
        const records = this.getPomodoroRecords();
        const result: { date: string; completed: number; workTime: number }[] = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const dateEnd = dateStart + 24 * 60 * 60 * 1000;
            
            const dayRecords = records.filter(record => 
                record.startTime >= dateStart && record.startTime < dateEnd && record.completed
            );
            
            const completed = dayRecords.length;
            const workTime = dayRecords.reduce((total, record) => total + record.duration, 0);
            
            result.push({
                date: date.toLocaleDateString('zh-CN'),
                completed,
                workTime
            });
        }
        
        return result;
    }
}