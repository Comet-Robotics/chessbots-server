/**
 * pair operations
 */
export abstract class Pair<T extends Pair<T>> {
    constructor(
        // Pair is implemented atomically and doesn't support mutation
        protected readonly item1: number,
        protected readonly item2: number,
    ) {
        if (item1 === undefined || item2 === undefined) {
            throw new Error("Pair must have two items");
        }

        if (Number.isNaN(item1) || Number.isNaN(item2)) {
            throw new Error("Pair items must be numbers, got " + item1 + " and " + item2);
        }
    }

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

    addTuple(tuple: [number, number]): T {
        const [item1, item2] = tuple;
        return this.create(this.item1 + item1, this.item2 + item2);
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

    equals(other: T) {
        return this.item1 === other.item1 && this.item2 === other.item2;
    }
}
