
export class QueueTask<T> {
    private time = 100;
    public onDo?: (d: T) => void;
    private data: T[] = [];
    private starting = false;
    constructor(t = 300) {
        this.time = t;
    }

    private wait(): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve()
            }, this.time)
        })
    }

    private async start() {
        if (this.starting) {
            return
        }
        this.starting = true;
        while (this.starting) {
            await this.wait();
            const d = this.data.shift();
            if (d === undefined) {
                this.starting = false
                break;
            }
            this.onDo?.(d);
        }
    }

    public abort() {
        this.starting = false;
    }

    public push(d: T) {
        this.data.push(d);
        this.start();
    }
}