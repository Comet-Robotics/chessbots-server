// adapted from https://itnext.io/priority-queue-in-typescript-6ef23116901
/**
 * An priority queue class since ts doesn't have one
 *
 * Inverted for ease of use with pricing (0 is lowest priority)
 */
export class PriorityQueue<T> {
    private data: [number, T][] = [];

    public insert(item: T, priority: number): boolean {
        if (this.data.length === 0) {
            this.data.push([priority, item]);
            return true;
        }

        for (let index = 0; index < this.data.length; index++) {
            if (index === this.data.length - 1) {
                this.data.push([priority, item]);
                return true;
            }

            if (this.data[index][0] < priority) {
                this.data.splice(index, 0, [priority, item]);
                return true;
            }
        }
        return false;
    }
    public peek(): T | undefined {
        return this.data.length === 0 ? undefined : this.data[0][1];
    }
    public pop(): T | undefined {
        return this.data !== undefined ? this.data.shift()?.[1] : undefined;
    }
    public popInd(num: number | undefined): T | undefined {
        if (num !== undefined && this.data !== undefined) {
            const data = this.data[num][1];
            // this.data.slice(0, num).concat(this.data.slice(num + 1, -1));
            this.data = this.data.slice(0, num).concat(this.data.slice(num + 1));
            return data;
        }
        return undefined;
    }
    public size(): number {
        return this.data.length;
    }
    public isEmpty(): boolean {
        return this.data.length === 0;
    }
    public find(entry: T) {
        for (let x = 0; x < this.data.length; x++) {
            if (this.data[x][1] === entry) {
                return x;
            }
        }
        return undefined;
    }
}
