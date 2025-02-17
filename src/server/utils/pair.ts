/**
 * pair operations
 */
export abstract class Pair<T extends Pair<T>> {
    constructor(
        // Pair is implemented atomically and doesn't support mutation
        protected readonly item1: number,
        protected readonly item2: number,
    ) {}

    /**
     * An abstract method used to dynamically generate new instances of the class at runtime.
     */
    protected abstract create(item1: number, item2: number): T;

    toTuple(): [number, number] {
        return [this.item1, this.item2];
    }

    neg(): T {
        return this.create(-this.item1, -this.item2);
    }

    add(other: T): T {
        return this.create(this.item1 + other.item1, this.item2 + other.item2);
    }

    sub(other: T): T {
        return this.create(this.item1 - other.item1, this.item2 - other.item2);
    }

    mul(other: T): T {
        return this.create(this.item1 * other.item1, this.item2 * other.item2);
    }

    div(other: T): T {
        return this.create(this.item1 / other.item1, this.item2 / other.item2);
    }
}
