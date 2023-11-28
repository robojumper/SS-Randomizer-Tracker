const ONE = BigInt(1);
const ZERO = BigInt(0);

/**
 * A fixed-size bit vector.
 */
export class BitVector {
    #size: number;
    #data: bigint;

    constructor(size: number, bits?: bigint) {
        this.#size = size;
        if (bits && bits >= (ONE << BigInt(size))) {
            throw new Error("constructing BigInt with wrong size");
        }
        this.#data = bits ?? ZERO;
    }

    get size() {
        return this.#size;
    }

    setBit(bit: number): this {
        this.#data |= ONE << BigInt(bit);
        return this;
    }

    clearBit(bit: number): this {
        this.#data = this.#data & (new BitVector(this.#size).setBit(bit).inverted()).#data
        return this;
    }

    inverted() {
        return new BitVector(this.#size, ((ONE << BigInt(this.#size)) - ONE) - this.#data);
    }

    and(other: BitVector) {
        if (other.#size !== this.#size) {
            throw new Error("and BigInt with wrong size");
        }
        return new BitVector(this.#size, other.#data & this.#data);
    }

    or(other: BitVector) {
        if (other.#size !== this.#size) {
            throw new Error("or BigInt with wrong size");
        }
        return new BitVector(this.#size, other.#data | this.#data);
    }

    test(bit: number) {
        if (bit >= this.#size) {
            throw new Error("wrong size")
        }
        return Boolean(this.#data & (ONE << BigInt(bit)));
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
        return new BitVector(this.#size, this.#data);
    }
}