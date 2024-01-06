const ONE = BigInt(1);
const ZERO = BigInt(0);

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
    data: bigint;
    intSet: Set<number>;

    constructor();
    constructor(bits: bigint, intSet: Set<number>);

    constructor(bits?: bigint, intSet?: Set<number>) {
        this.data = bits ?? ZERO;
        this.intSet = intSet ?? new Set();
    }

    setBit(bit: number): this {
        this.data |= ONE << BigInt(bit);
        this.intSet.add(bit);
        return this;
    }

    clearBit(bit: number): this {
        if (this.intSet.has(bit)) {
            this.data = this.data - (ONE << BigInt(bit));
            this.intSet.delete(bit);
        }
        return this;
    }

    and(other: BitVector) {
        return new BitVector(other.data & this.data, intersection(other.intSet, this.intSet));
    }

    or(other: BitVector) {
        return new BitVector(other.data | this.data, union(other.intSet, this.intSet));
    }

    test(bit: number) {
        return this.intSet.has(bit);
    }

    isSubsetOf(other: BitVector) {
        return this.numSetBits <= other.numSetBits && (this.data | other.data) === other.data;
    }

    equals(other: BitVector) {
        return this.data === other.data;
    }

    /**
     * slow
     */
    toString(domainSize: number) {
        let str = "";
        for (let bit = domainSize - 1; bit >= 0; bit--) {
            if (this.data & (ONE << BigInt(bit))) {
                str += '1';
            } else {
                str += '0';
            }
        }
        return str;
    }

    clone() {
        return new BitVector(this.data, new Set(this.intSet));
    }

    isEmpty() {
        return this.numSetBits === 0;
    }

    iter() {
        return this.intSet.values()
    }

    get numSetBits() {
        return this.intSet.size
    }
}