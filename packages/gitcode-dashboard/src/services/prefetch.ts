// packages/gitcode-dashboard/src/services/prefetch.ts

interface PrefetchTask {
  id: string;
  task: () => Promise<void>;
}

class PrefetchService {
  private queue: PrefetchTask[] = [];
  private isIdleCallbackScheduled = false;

  public addTask(id: string, task: () => Promise<void>, highPriority = false) {
    // 检查任务是否已在队列中
    const existingTaskIndex = this.queue.findIndex(item => item.id === id);

    if (existingTaskIndex !== -1) {
      // 如果存在，先移除
      const [existingTask] = this.queue.splice(existingTaskIndex, 1);
      if (highPriority) {
        // 高优先级，插入队首
        this.queue.unshift(existingTask);
      } else {
        // 非高优先级，放回队尾
        this.queue.push(existingTask);
      }
    } else {
      // 新任务
      const newTask = { id, task };
      if (highPriority) {
        this.queue.unshift(newTask);
      } else {
        this.queue.push(newTask);
      }
    }

    // 如果循环未启动，则启动它
    if (!this.isIdleCallbackScheduled) {
      this.start();
    }
  }

  public start() {
    if (this.isIdleCallbackScheduled) {
      return;
    }
    this.isIdleCallbackScheduled = true;
    this.scheduleIdleCallback();
  }

  private scheduleIdleCallback() {
    requestIdleCallback(async (deadline) => {
      // 当浏览器有空闲时间且队列中有任务时执行
      while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && this.queue.length > 0) {
        const taskToRun = this.queue.shift();
        if (taskToRun) {
          await taskToRun.task();
        }
      }

      // 如果队列中还有任务，继续调度
      if (this.queue.length > 0) {
        this.scheduleIdleCallback();
      } else {
        // 队列空了，停止调度
        this.isIdleCallbackScheduled = false;
      }
    });
  }
}

// 导出单例
export const prefetchService = new PrefetchService();
