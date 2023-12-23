import { makeDay, makeNight } from './Logic';
import { BitLogic } from './bitlogic/BitLogic';
import { BitVector } from './bitlogic/BitVector';
import { LogicalExpression } from './bitlogic/LogicalExpression';

/**
 * A helper class for bridging the stringly-typed requirements to bit logic.
 * Used when initially building logic and when mapping tracker state to logic.
 */
export class LogicBuilder {
    bitLogic: BitLogic;
    itemList: string[];
    itemLookup: Record<string, number>;

    implications: Record<number, LogicalExpression> | LogicalExpression[];

    constructor(
        bitLogic: BitLogic,
        allItems: string[],
        implications: Record<number, LogicalExpression> | LogicalExpression[],
    ) {
        this.bitLogic = bitLogic;
        this.itemList = allItems;
        this.itemLookup = Object.fromEntries(
            [...allItems.entries()].map(([idx, name]) => [name, idx]),
        );
        this.implications = implications;
    }

    true(): LogicalExpression {
        return LogicalExpression.true(this.bitLogic.numBits);
    }

    false(): LogicalExpression {
        return LogicalExpression.false();
    }

    singleBit(item: string): LogicalExpression {
        return new LogicalExpression([
            new BitVector(this.bitLogic.numBits).setBit(this.bit(item)),
        ]);
    }

    set(target: string, rhs: LogicalExpression) {
        const bit = this.bit(target);
        if (bit !== undefined) {
            this.implications[bit] = rhs;
        } else {
            console.error('unknown item', target);
        }
    }

    addAlternative(target: string, source: LogicalExpression) {
        const bit = this.bit(target);
        this.implications[bit] = (this.implications[bit] ?? this.false()).or(
            source,
        );
    }

    bit(item: string): number {
        return this.itemLookup[item];
    }

    day(item: string) {
        return makeDay(item);
    }

    night(item: string) {
        return makeNight(item);
    }
}
