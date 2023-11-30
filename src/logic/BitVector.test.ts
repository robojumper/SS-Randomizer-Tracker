import { BitVector } from "./BitVector";

test('basic tests', () => {
    const vec = new BitVector(8);
    vec.setBit(7);
    expect(vec.toString()).toBe('10000000');
    vec.setBit(6);
    expect(vec.toString()).toBe('11000000');
    vec.setBit(4);
    expect(vec.toString()).toBe('11010000');
    vec.clearBit(6);
    expect(vec.toString()).toBe('10010000');
});

test('or tests', () => {
    const vec = new BitVector(8);
    vec.setBit(7);

    const vec2 = new BitVector(8);
    vec2.setBit(7);
    vec2.setBit(3);
    expect(vec.or(vec2).toString()).toBe('10001000');
});