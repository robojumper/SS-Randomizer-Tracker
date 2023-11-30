const ONE = BigInt(1);
const ZERO = BigInt(0);

function invert(size: number, bits: bigint): bigint {
    return ((ONE << BigInt(size)) - ONE) - bits;
}

function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
    if (a.size > b.size) {
        const tmp = a;
        // eslint-disable-next-line no-param-reassign
        a = b;
        // eslint-disable-next-line no-param-reassign
        b = tmp;
    }
    return new Set([...a].filter((v) => b.has(v)));
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
    return new Set([...a, ...b]);
}

/**
 * A fixed-size bit vector.
 */
export class BitVector {
    #size: number;
    #data: bigint;
    #intSet: Set<number>;

    constructor(size: number);
    constructor(size: number, bits: bigint, intSet: Set<number>);

    constructor(size: number, bits?: bigint, intSet?: Set<number>) {
        this.#size = size;
        if (bits && bits >= (ONE << BigInt(size))) {
            throw new Error("constructing BigInt with wrong size");
        }
        this.#data = bits ?? ZERO;
        this.#intSet = intSet ?? new Set();
    }

    /**
     * Vector domain size
     */
    get size() {
        return this.#size;
    }

    setBit(bit: number): this {
        this.#data |= ONE << BigInt(bit);
        this.#intSet.add(bit);
        return this;
    }

    clearBit(bit: number): this {
        this.#data = this.#data & (invert(this.#size, ONE << BigInt(bit)));
        this.#intSet.delete(bit);
        return this;
    }

    and(other: BitVector) {
        if (other.#size !== this.#size) {
            throw new Error("and BigInt with wrong size");
        }
        return new BitVector(this.#size, other.#data & this.#data, intersection(other.#intSet, this.#intSet));
    }

    or(other: BitVector) {
        if (other.#size !== this.#size) {
            throw new Error("or BigInt with wrong size");
        }
        return new BitVector(this.#size, other.#data | this.#data, union(other.#intSet, this.#intSet));
    }

    test(bit: number) {
        if (bit >= this.#size) {
            throw new Error("wrong size")
        }
        return this.#intSet.has(bit);
    }

    isSubsetOf(other: BitVector) {
        if (other.#size !== this.#size) {
            throw new Error("or BigInt with wrong size");
        }
        return (this.#data | other.#data) === other.#data;
    }

    /**
     * slow
     */
    toString() {
        let str = "";
        for (let bit = this.#size - 1; bit >= 0; bit--) {
            if (this.#data & (ONE << BigInt(bit))) {
                str += '1';
            } else {
                str += '0';
            }
        }
        return str;
    }

    clone() {
        return new BitVector(this.#size, this.#data, this.#intSet);
    }

    isEmpty() {
        return this.#data === ZERO;
    }

    iter() {
        return this.#intSet.values()
    }

    get numSetBits() {
        return this.#intSet.size
    }
}